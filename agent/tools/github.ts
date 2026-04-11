import { Octokit } from '@octokit/rest';
import { OpenQADatabase } from '../../database/index.js';

export class GitHubTools {
  private octokit: Octokit | null = null;
  private db: OpenQADatabase;
  private sessionId: string;
  private config: { token?: string; owner?: string; repo?: string };

  constructor(db: OpenQADatabase, sessionId: string, config: { token?: string; owner?: string; repo?: string }) {
    this.db = db;
    this.sessionId = sessionId;
    this.config = config;
    
    if (config.token) {
      this.octokit = new Octokit({ auth: config.token });
    }
  }

  getTools() {
    return [
      {
        name: 'create_github_issue',
        description: 'Create a GitHub issue when a critical bug is found. Use this for bugs that require developer attention.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Issue title (concise and descriptive)' },
            body: { type: 'string', description: 'Detailed description with steps to reproduce' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Bug severity' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Labels for the issue' },
            screenshot_path: { type: 'string', description: 'Path to screenshot evidence' }
          },
          required: ['title', 'body', 'severity']
        },
        execute: async ({ title, body, severity, labels = [], screenshot_path }: { title: string; body: string; severity: 'low' | 'medium' | 'high' | 'critical'; labels?: string[]; screenshot_path?: string }) => {
          if (!this.octokit || !this.config.owner || !this.config.repo) {
            return 'GitHub not configured. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.';
          }

          try {
            const severityLabel = `severity: ${severity}`;
            const allLabels = ['automated-qa', severityLabel, ...labels];

            const issueBody = `## 🤖 Automated QA Report

${body}

---

**Severity:** ${severity.toUpperCase()}
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

            const bug = this.db.createBug({
              session_id: this.sessionId,
              title,
              description: body,
              severity,
              status: 'open',
              github_issue_url: issue.data.html_url,
              screenshot_path
            });

            return `✅ GitHub issue created successfully!\nURL: ${issue.data.html_url}\nIssue #${issue.data.number}`;
          } catch (error: unknown) {
            return `❌ Failed to create GitHub issue: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    ];
  }
}
