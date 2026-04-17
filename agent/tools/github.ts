import { Octokit } from '@octokit/rest';
import { OpenQADatabase } from '../../database/index.js';
import { FindingDeduplicator } from '../dedup/index.js';
import { ConfidenceScorer } from '../confidence/index.js';

export class GitHubTools {
  private octokit!: Octokit;
  private db: OpenQADatabase;
  private sessionId: string;
  private config: { token?: string; owner?: string; repo?: string };
  private dedup: FindingDeduplicator;
  private confidence: ConfidenceScorer;

  constructor(db: OpenQADatabase, sessionId: string, config: { token?: string; owner?: string; repo?: string }) {
    this.db = db;
    this.sessionId = sessionId;
    this.config = config;
    // Always initialize Octokit — public repos work without a token (60 req/hr anon, 5000/hr with token)
    this.octokit = new Octokit(config.token ? { auth: config.token } : {});
    this.dedup = new FindingDeduplicator(db);
    this.confidence = new ConfidenceScorer();
  }

  getTools() {
    return [
      {
        name: 'create_github_issue',
        description: 'Create a GitHub issue when a critical bug is found. Use this for bugs that require developer attention.',
        parameters: [
          { name: 'title', type: 'string' as const, description: 'Issue title (concise and descriptive)', required: true },
          { name: 'body', type: 'string' as const, description: 'Detailed description with steps to reproduce', required: true },
          { name: 'severity', type: 'string' as const, description: 'Bug severity (low, medium, high, critical)', required: true },
          { name: 'labels', type: 'string' as const, description: 'Comma-separated labels for the issue', required: false },
          { name: 'screenshot_path', type: 'string' as const, description: 'Path to screenshot evidence', required: false }
        ],
        execute: async ({
          title,
          body,
          severity,
          labels,
          screenshot_path,
          url = '',
          category = 'general',
          specialist_type,
        }: {
          title: string;
          body: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          labels?: string | string[];
          screenshot_path?: string;
          url?: string;
          category?: string;
          specialist_type?: string;
        }) => {
          if (!this.config.token || !this.config.owner || !this.config.repo) {
            return { output: 'GitHub not configured. Creating issues requires GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.', error: 'GitHub token required' };
          }

          try {
            // ── 1. Duplicate check ──────────────────────────────────────────
            const { isDuplicate, fingerprint } = this.dedup.checkAndRegister(title, url, category);
            if (isDuplicate) {
              return { output: `⚠️ Duplicate finding skipped (already reported): "${title}" [fp: ${fingerprint}]` };
            }

            // ── 2. Confidence scoring ───────────────────────────────────────
            const result = this.confidence.score({
              title,
              description: body,
              severity,
              evidence: screenshot_path,
              specialist_type,
              category,
            });

            if (result.verdict === 'discard') {
              return {
                output: `🗑️ Finding discarded (low confidence ${result.score}/100): "${title}"\nReasons: ${result.reasons.join(', ')}`
              };
            }

            if (result.verdict === 'needs-review') {
              this.db.createProposedFinding({
                session_id: this.sessionId,
                title,
                description: body,
                severity,
                category,
                confidence: result.score,
                confidence_reasons: result.reasons,
                evidence: screenshot_path,
                url,
                specialist_type,
              });
              return {
                output: `🔍 Finding queued for human review (confidence ${result.score}/100): "${title}"\nGo to /approvals to review.\nReasons: ${result.reasons.join(', ')}`
              };
            }

            // ── 3. Auto-approve: create GitHub issue ────────────────────────
            const labelsArray: string[] = Array.isArray(labels) ? labels : (labels ? [labels] : []);
            const severityLabel = `severity: ${severity}`;
            const allLabels = ['automated-qa', severityLabel, ...labelsArray];

            const issueBody = `## 🤖 Automated QA Report

${body}

---

**Severity:** ${severity.toUpperCase()}
**Confidence:** ${result.score}/100
**Detected by:** OpenQA Agent
**Session ID:** ${this.sessionId}
${screenshot_path ? `**Screenshot:** ${screenshot_path}` : ''}

*This issue was automatically created by OpenQA during automated testing.*`;

            const issue = await this.octokit.rest.issues.create({
              owner: this.config.owner,
              repo: this.config.repo,
              title: `[QA] ${title}`,
              body: issueBody,
              labels: allLabels
            });

            this.db.createAction({
              session_id: this.sessionId,
              type: 'github_issue',
              description: `Created GitHub issue: ${title}`,
              input: JSON.stringify({ title, severity }),
              output: issue.data.html_url
            });

            this.db.createBug({
              session_id: this.sessionId,
              title,
              description: body,
              severity,
              status: 'open',
              github_issue_url: issue.data.html_url,
              screenshot_path
            });

            return { output: `✅ GitHub issue created (confidence ${result.score}/100, auto-approved)!\nURL: ${issue.data.html_url}\nIssue #${issue.data.number}` };
          } catch (error: unknown) {
            return { output: `❌ Failed to create GitHub issue: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },

      {
        name: 'get_repository_info',
        description: 'Get metadata about the GitHub repository: description, language, topics, stats, open issue count.',
        parameters: [],
        execute: async () => {
          if (!this.config.owner || !this.config.repo) {
            return { output: 'GitHub owner and repo not configured.' };
          }
          try {
            const [repo, langs] = await Promise.all([
              this.octokit.rest.repos.get({ owner: this.config.owner, repo: this.config.repo }),
              this.octokit.rest.repos.listLanguages({ owner: this.config.owner, repo: this.config.repo }),
            ]);
            const r = repo.data;
            return {
              output: JSON.stringify({
                name: r.full_name,
                description: r.description,
                language: r.language,
                languages: Object.keys(langs.data),
                topics: r.topics,
                stars: r.stargazers_count,
                forks: r.forks_count,
                open_issues: r.open_issues_count,
                default_branch: r.default_branch,
                has_wiki: r.has_wiki,
                has_issues: r.has_issues,
                license: r.license?.spdx_id,
                created_at: r.created_at,
                updated_at: r.updated_at,
              }, null, 2)
            };
          } catch (error: unknown) {
            return { output: `Failed to get repo info: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },

      {
        name: 'list_github_issues',
        description: 'List open GitHub issues in the repository to understand existing bugs and problems.',
        parameters: [
          { name: 'state', type: 'string' as const, description: 'Filter by state: open, closed, all (default: open)', required: false },
          { name: 'per_page', type: 'number' as const, description: 'Number of issues to fetch (max 30, default 20)', required: false },
        ],
        execute: async ({ state = 'open', per_page = 20 }: { state?: string; per_page?: number }) => {
          if (!this.config.owner || !this.config.repo) {
            return { output: 'GitHub owner and repo not configured.' };
          }
          try {
            const res = await this.octokit.rest.issues.listForRepo({
              owner: this.config.owner,
              repo: this.config.repo,
              state: state as 'open' | 'closed' | 'all',
              per_page: Math.min(per_page, 30),
            });
            const issues = res.data.filter(i => !i.pull_request).map(i => ({
              number: i.number,
              title: i.title,
              state: i.state,
              labels: i.labels.map((l: any) => (typeof l === 'string' ? l : l.name)),
              created_at: i.created_at,
              comments: i.comments,
              url: i.html_url,
            }));
            return { output: JSON.stringify(issues, null, 2) };
          } catch (error: unknown) {
            return { output: `Failed to list issues: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },

      {
        name: 'list_pull_requests',
        description: 'List recent pull requests to understand code activity and potential quality concerns.',
        parameters: [
          { name: 'state', type: 'string' as const, description: 'open, closed, or all (default: open)', required: false },
        ],
        execute: async ({ state = 'open' }: { state?: string }) => {
          if (!this.config.owner || !this.config.repo) {
            return { output: 'GitHub owner and repo not configured.' };
          }
          try {
            const res = await this.octokit.rest.pulls.list({
              owner: this.config.owner,
              repo: this.config.repo,
              state: state as 'open' | 'closed' | 'all',
              per_page: 15,
            });
            const prs = res.data.map(pr => ({
              number: pr.number,
              title: pr.title,
              state: pr.state,
              draft: pr.draft,
              created_at: pr.created_at,
              updated_at: pr.updated_at,
              url: pr.html_url,
            }));
            return { output: JSON.stringify(prs, null, 2) };
          } catch (error: unknown) {
            return { output: `Failed to list PRs: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },

      {
        name: 'get_file_content',
        description: 'Read the content of a specific file in the repository (e.g. package.json, README.md, src/index.ts). Use to audit dependencies, check for secrets, review code.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'File path relative to repo root (e.g. package.json)', required: true },
        ],
        execute: async ({ path }: { path: string }) => {
          if (!this.config.owner || !this.config.repo) {
            return { output: 'GitHub owner and repo not configured.' };
          }
          try {
            const res = await this.octokit.rest.repos.getContent({
              owner: this.config.owner,
              repo: this.config.repo,
              path,
            });
            const data = res.data as any;
            if (data.type !== 'file') {
              return { output: `${path} is a directory, not a file.` };
            }
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            // Truncate large files to first 4000 chars to stay within tokens
            return { output: content.length > 4000 ? content.slice(0, 4000) + '\n[... truncated]' : content };
          } catch (error: unknown) {
            return { output: `Failed to read ${path}: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },

      {
        name: 'list_directory',
        description: 'List files and directories at a path in the repository.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'Directory path (default: root "")', required: false },
        ],
        execute: async ({ path = '' }: { path?: string }) => {
          if (!this.config.owner || !this.config.repo) {
            return { output: 'GitHub owner and repo not configured.' };
          }
          try {
            const res = await this.octokit.rest.repos.getContent({
              owner: this.config.owner,
              repo: this.config.repo,
              path,
            });
            const items = (res.data as any[]).map((f: any) => ({ name: f.name, type: f.type, path: f.path }));
            return { output: JSON.stringify(items, null, 2) };
          } catch (error: unknown) {
            return { output: `Failed to list ${path}: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },
    ];
  }
}
