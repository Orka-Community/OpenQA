import { EventEmitter } from 'events';
import { Octokit } from '@octokit/rest';
import { logger } from '../logger.js';

export interface GitEvent {
  type: 'merge' | 'push' | 'pipeline_success' | 'pipeline_failure' | 'tag';
  provider: 'github' | 'gitlab';
  branch: string;
  commit: string;
  author: string;
  message: string;
  timestamp: Date;
  pipelineId?: string;
  pipelineStatus?: string;
  changedFiles?: string[];
}

export interface GitListenerConfig {
  provider: 'github' | 'gitlab';
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  pollIntervalMs?: number;
  gitlabUrl?: string;
}

interface GitLabCommit {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
  parent_ids?: string[];
}

interface GitLabPipeline {
  id: number;
  status: string;
  ref: string;
  sha: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    username: string;
  };
}

interface GitLabWebhook {
  id: number;
  url: string;
  push_events: boolean;
  merge_requests_events: boolean;
  pipeline_events: boolean;
}

export class GitListener extends EventEmitter {
  private config: GitListenerConfig;
  private octokit: Octokit | null = null;
  private lastCommitSha: string | null = null;
  private lastPipelineId: string | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: GitListenerConfig) {
    super();
    this.config = {
      branch: 'main',
      pollIntervalMs: 60000,
      gitlabUrl: 'https://gitlab.com',
      ...config
    };

    if (config.provider === 'github' && config.token) {
      this.octokit = new Octokit({ auth: config.token });
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('GitListener started', { provider: this.config.provider, owner: this.config.owner, repo: this.config.repo });
    
    await this.checkInitialState();
    
    this.pollInterval = setInterval(() => {
      this.poll().catch((e) => logger.error('Poll error', { error: e instanceof Error ? e.message : String(e) }));
    }, this.config.pollIntervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info('GitListener stopped');
  }

  private async checkInitialState() {
    try {
      if (this.config.provider === 'github') {
        await this.checkGitHubState();
      } else {
        await this.checkGitLabState();
      }
    } catch (error) {
      logger.error('Failed to check initial state', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async poll() {
    try {
      if (this.config.provider === 'github') {
        await this.pollGitHub();
      } else {
        await this.pollGitLab();
      }
    } catch (error) {
      logger.error('Poll error', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async checkGitHubState() {
    if (!this.octokit) return;

    const { data: commits } = await this.octokit.repos.listCommits({
      owner: this.config.owner,
      repo: this.config.repo,
      sha: this.config.branch,
      per_page: 1
    });

    if (commits.length > 0) {
      this.lastCommitSha = commits[0].sha;
    }

    try {
      const { data: runs } = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        branch: this.config.branch,
        per_page: 1
      });

      if (runs.workflow_runs.length > 0) {
        this.lastPipelineId = runs.workflow_runs[0].id.toString();
      }
    } catch {
    }
  }

  private async pollGitHub() {
    if (!this.octokit) return;

    const { data: commits } = await this.octokit.repos.listCommits({
      owner: this.config.owner,
      repo: this.config.repo,
      sha: this.config.branch,
      per_page: 5
    });

    for (const commit of commits) {
      if (this.lastCommitSha && commit.sha === this.lastCommitSha) break;

      const isMerge = commit.parents && commit.parents.length > 1;
      
      const event: GitEvent = {
        type: isMerge ? 'merge' : 'push',
        provider: 'github',
        branch: this.config.branch!,
        commit: commit.sha,
        author: commit.commit.author?.name || 'unknown',
        message: commit.commit.message,
        timestamp: new Date(commit.commit.author?.date || Date.now())
      };

      this.emit('git-event', event);
      
      if (isMerge) {
        this.emit('merge', event);
        logger.info('Merge detected', { branch: this.config.branch, sha: commit.sha.slice(0, 7) });
      }
    }

    if (commits.length > 0) {
      this.lastCommitSha = commits[0].sha;
    }

    try {
      const { data: runs } = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        branch: this.config.branch,
        per_page: 5
      });

      for (const run of runs.workflow_runs) {
        if (this.lastPipelineId && run.id.toString() === this.lastPipelineId) break;

        if (run.status === 'completed') {
          const event: GitEvent = {
            type: run.conclusion === 'success' ? 'pipeline_success' : 'pipeline_failure',
            provider: 'github',
            branch: this.config.branch!,
            commit: run.head_sha,
            author: run.actor?.login || 'unknown',
            message: run.name || '',
            timestamp: new Date(run.updated_at || Date.now()),
            pipelineId: run.id.toString(),
            pipelineStatus: run.conclusion || undefined
          };

          this.emit('git-event', event);
          
          if (run.conclusion === 'success') {
            this.emit('pipeline-success', event);
            logger.info('Pipeline success', { name: run.name, id: run.id });
          } else {
            this.emit('pipeline-failure', event);
            logger.warn('Pipeline failure', { name: run.name, id: run.id });
          }
        }
      }

      if (runs.workflow_runs.length > 0) {
        this.lastPipelineId = runs.workflow_runs[0].id.toString();
      }
    } catch {
    }
  }

  private async checkGitLabState() {
    const headers = { 'PRIVATE-TOKEN': this.config.token };
    const projectPath = encodeURIComponent(`${this.config.owner}/${this.config.repo}`);
    const baseUrl = this.config.gitlabUrl;

    try {
      const commitsRes = await fetch(
        `${baseUrl}/api/v4/projects/${projectPath}/repository/commits?ref_name=${this.config.branch}&per_page=1`,
        { headers }
      );
      const commits = await commitsRes.json() as GitLabCommit[];
      if (commits.length > 0) {
        this.lastCommitSha = commits[0].id;
      }

      const pipelinesRes = await fetch(
        `${baseUrl}/api/v4/projects/${projectPath}/pipelines?ref=${this.config.branch}&per_page=1`,
        { headers }
      );
      const pipelines = await pipelinesRes.json() as GitLabPipeline[];
      if (pipelines.length > 0) {
        this.lastPipelineId = pipelines[0].id.toString();
      }
    } catch (error) {
      logger.error('GitLab initial state error', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async pollGitLab() {
    const headers = { 'PRIVATE-TOKEN': this.config.token };
    const projectPath = encodeURIComponent(`${this.config.owner}/${this.config.repo}`);
    const baseUrl = this.config.gitlabUrl;

    try {
      const commitsRes = await fetch(
        `${baseUrl}/api/v4/projects/${projectPath}/repository/commits?ref_name=${this.config.branch}&per_page=5`,
        { headers }
      );
      const commits = await commitsRes.json() as GitLabCommit[];

      for (const commit of commits) {
        if (this.lastCommitSha && commit.id === this.lastCommitSha) break;

        const isMerge = commit.parent_ids && commit.parent_ids.length > 1;

        const event: GitEvent = {
          type: isMerge ? 'merge' : 'push',
          provider: 'gitlab',
          branch: this.config.branch!,
          commit: commit.id,
          author: commit.author_name,
          message: commit.message,
          timestamp: new Date(commit.created_at)
        };

        this.emit('git-event', event);
        
        if (isMerge) {
          this.emit('merge', event);
          logger.info('Merge detected', { branch: this.config.branch, id: commit.id.slice(0, 7) });
        }
      }

      if (commits.length > 0) {
        this.lastCommitSha = commits[0].id;
      }

      const pipelinesRes = await fetch(
        `${baseUrl}/api/v4/projects/${projectPath}/pipelines?ref=${this.config.branch}&per_page=5`,
        { headers }
      );
      const pipelines = await pipelinesRes.json() as GitLabPipeline[];

      for (const pipeline of pipelines) {
        if (this.lastPipelineId && pipeline.id.toString() === this.lastPipelineId) break;

        if (pipeline.status === 'success' || pipeline.status === 'failed') {
          const event: GitEvent = {
            type: pipeline.status === 'success' ? 'pipeline_success' : 'pipeline_failure',
            provider: 'gitlab',
            branch: this.config.branch!,
            commit: pipeline.sha,
            author: pipeline.user?.name || 'unknown',
            message: `Pipeline #${pipeline.id}`,
            timestamp: new Date(pipeline.updated_at),
            pipelineId: pipeline.id.toString(),
            pipelineStatus: pipeline.status
          };

          this.emit('git-event', event);
          
          if (pipeline.status === 'success') {
            this.emit('pipeline-success', event);
            logger.info('Pipeline success', { id: pipeline.id });
          } else {
            this.emit('pipeline-failure', event);
            logger.warn('Pipeline failure', { id: pipeline.id });
          }
        }
      }

      if (pipelines.length > 0) {
        this.lastPipelineId = pipelines[0].id.toString();
      }
    } catch (error) {
      logger.error('GitLab poll error', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async setupWebhook(webhookUrl: string): Promise<string> {
    if (this.config.provider === 'github') {
      return this.setupGitHubWebhook(webhookUrl);
    } else {
      return this.setupGitLabWebhook(webhookUrl);
    }
  }

  private async setupGitHubWebhook(webhookUrl: string): Promise<string> {
    if (!this.octokit) throw new Error('GitHub not configured');

    const { data } = await this.octokit.repos.createWebhook({
      owner: this.config.owner,
      repo: this.config.repo,
      config: {
        url: webhookUrl,
        content_type: 'json'
      },
      events: ['push', 'pull_request', 'workflow_run']
    });

    return data.id.toString();
  }

  private async setupGitLabWebhook(webhookUrl: string): Promise<string> {
    const headers = { 
      'PRIVATE-TOKEN': this.config.token,
      'Content-Type': 'application/json'
    };
    const projectPath = encodeURIComponent(`${this.config.owner}/${this.config.repo}`);

    const res = await fetch(
      `${this.config.gitlabUrl}/api/v4/projects/${projectPath}/hooks`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: webhookUrl,
          push_events: true,
          merge_requests_events: true,
          pipeline_events: true
        })
      }
    );

    const data = await res.json() as GitLabWebhook;
    return data.id.toString();
  }
}
