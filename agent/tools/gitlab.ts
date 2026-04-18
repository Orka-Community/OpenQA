/**
 * GitLabTools — mirror of GitHubTools using the GitLab REST API v4.
 *
 * Tool names are intentionally identical to GitHubTools so that the specialist
 * prompts (which reference `get_repository_info`, `list_github_issues`, etc.)
 * work without modification in GitLab mode.
 */

import { OpenQADatabase } from '../../database/index.js';
import { FindingDeduplicator } from '../dedup/index.js';
import { ConfidenceScorer } from '../confidence/index.js';

export class GitLabTools {
  private baseUrl: string;          // e.g. https://gitlab.com
  private token: string;
  private projectPath: string;      // e.g. "myorg/myrepo"
  private encodedProject: string;   // encodeURIComponent("myorg/myrepo")
  private db: OpenQADatabase;
  private sessionId: string;
  private dedup: FindingDeduplicator;
  private confidence: ConfidenceScorer;

  constructor(
    db: OpenQADatabase,
    sessionId: string,
    config: { token?: string; project?: string; url?: string },
  ) {
    this.db         = db;
    this.sessionId  = sessionId;
    this.token      = config.token   || '';
    this.projectPath= config.project || '';
    this.encodedProject = encodeURIComponent(this.projectPath);
    this.baseUrl    = (config.url || 'https://gitlab.com').replace(/\/$/, '');
    this.dedup      = new FindingDeduplicator(db);
    this.confidence = new ConfidenceScorer();
  }

  // ── Internal fetch helper ─────────────────────────────────────────────────

  private async api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OpenQA/3.1',
      ...(opts.headers as Record<string, string> || {}),
    };
    if (this.token) headers['PRIVATE-TOKEN'] = this.token;

    const res = await fetch(`${this.baseUrl}/api/v4${path}`, {
      ...opts,
      headers,
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitLab API ${res.status} on ${path}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Tools (same names as GitHubTools for prompt compatibility) ───────────

  getTools() {
    const p = this.projectPath;

    return [

      // ── create_github_issue — name kept for specialist prompt compat ───────
      {
        name: 'create_github_issue',
        description: 'Create a GitLab issue when a critical bug is found.',
        parameters: [
          { name: 'title',           type: 'string' as const, description: 'Issue title',                          required: true  },
          { name: 'body',            type: 'string' as const, description: 'Detailed description',                 required: true  },
          { name: 'severity',        type: 'string' as const, description: 'low, medium, high, or critical',       required: true  },
          { name: 'labels',          type: 'string' as const, description: 'Comma-separated labels',               required: false },
          { name: 'screenshot_path', type: 'string' as const, description: 'Path to screenshot evidence',          required: false },
        ],
        execute: async ({
          title,
          body,
          severity,
          labels,
          screenshot_path,
          url        = '',
          category   = 'general',
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
          if (!p) return { output: 'GitLab project not configured.' };

          try {
            const { isDuplicate, fingerprint } = this.dedup.checkAndRegister(title, url, category);
            if (isDuplicate) {
              return { output: `⚠️ Duplicate finding skipped: "${title}" [fp: ${fingerprint}]` };
            }

            const scored = this.confidence.score({ title, description: body, severity, evidence: screenshot_path, specialist_type, category });

            if (scored.verdict === 'discard') {
              return { output: `🗑️ Finding discarded (${scored.score}/100): "${title}"\n${scored.reasons.join(', ')}` };
            }
            if (scored.verdict === 'needs-review') {
              this.db.createProposedFinding({ session_id: this.sessionId, title, description: body, severity, category, confidence: scored.score, confidence_reasons: scored.reasons, evidence: screenshot_path, url, specialist_type });
              return { output: `🔍 Finding queued for review (${scored.score}/100): "${title}"\nGo to /approvals.` };
            }

            const labelsArray = typeof labels === 'string' ? labels.split(',').map(l => l.trim()) : (labels || []);
            const allLabels   = ['automated-qa', `severity::${severity}`, ...labelsArray];

            const issueBody = `## 🤖 Automated QA Report\n\n${body}\n\n---\n\n**Severity:** ${severity.toUpperCase()}\n**Confidence:** ${scored.score}/100\n**Detected by:** OpenQA Agent\n**Session:** ${this.sessionId}`;

            const issue = await this.api<{ iid: number; web_url: string }>(
              `/projects/${this.encodedProject}/issues`,
              {
                method: 'POST',
                body: JSON.stringify({ title: `[QA] ${title}`, description: issueBody, labels: allLabels.join(',') }),
              },
            );

            await this.db.createAction({ session_id: this.sessionId, type: 'gitlab_issue', description: `Created GitLab issue: ${title}`, input: JSON.stringify({ title, severity }), output: issue.web_url });
            await this.db.createBug({ session_id: this.sessionId, title, description: body, severity, status: 'open', github_issue_url: issue.web_url, screenshot_path });

            return { output: `✅ GitLab issue created (${scored.score}/100, auto-approved)!\nURL: ${issue.web_url}\nIssue #${issue.iid}` };
          } catch (err: unknown) {
            return { output: `❌ Failed to create GitLab issue: ${err instanceof Error ? err.message : String(err)}`, error: String(err) };
          }
        },
      },

      // ── get_repository_info ───────────────────────────────────────────────
      {
        name: 'get_repository_info',
        description: 'Get metadata about the GitLab project: description, language, topics, stats, open issue count.',
        parameters: [],
        execute: async () => {
          if (!p) return { output: 'GitLab project not configured.' };
          try {
            const proj = await this.api<Record<string, unknown>>(`/projects/${this.encodedProject}`);
            const langs = await this.api<Record<string, number>>(`/projects/${this.encodedProject}/languages`).catch(() => ({}));
            return {
              output: JSON.stringify({
                name:           proj['path_with_namespace'],
                description:    proj['description'],
                language:       Object.keys(langs)[0] || null,
                languages:      Object.keys(langs),
                topics:         proj['topics'],
                stars:          proj['star_count'],
                forks:          proj['forks_count'],
                open_issues:    proj['open_issues_count'],
                default_branch: proj['default_branch'],
                visibility:     proj['visibility'],
                created_at:     proj['created_at'],
                updated_at:     proj['last_activity_at'],
              }, null, 2),
            };
          } catch (err: unknown) {
            return { output: `Failed to get project info: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      },

      // ── list_github_issues — name kept for compat ─────────────────────────
      {
        name: 'list_github_issues',
        description: 'List open GitLab issues in the project.',
        parameters: [
          { name: 'state',    type: 'string' as const, description: 'opened, closed, or all (default: opened)', required: false },
          { name: 'per_page', type: 'number' as const, description: 'Number of issues to fetch (max 30)',        required: false },
        ],
        execute: async ({ state = 'opened', per_page = 20 }: { state?: string; per_page?: number }) => {
          if (!p) return { output: 'GitLab project not configured.' };
          try {
            // GitLab uses "opened"/"closed"/"all"
            const glState = state === 'open' ? 'opened' : state === 'closed' ? 'closed' : 'all';
            const issues = await this.api<Record<string, unknown>[]>(
              `/projects/${this.encodedProject}/issues?state=${glState}&per_page=${Math.min(per_page, 30)}&labels=`,
            );
            const mapped = issues.map(i => ({
              number:     i['iid'],
              title:      i['title'],
              state:      i['state'],
              labels:     (i['labels'] as string[]) || [],
              created_at: i['created_at'],
              comments:   i['user_notes_count'] ?? 0,
              url:        i['web_url'],
            }));
            return { output: JSON.stringify(mapped, null, 2) };
          } catch (err: unknown) {
            return { output: `Failed to list issues: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      },

      // ── list_pull_requests ───────────────────────────────────────────────
      {
        name: 'list_pull_requests',
        description: 'List recent GitLab merge requests.',
        parameters: [
          { name: 'state', type: 'string' as const, description: 'opened, closed, or all (default: opened)', required: false },
        ],
        execute: async ({ state = 'opened' }: { state?: string }) => {
          if (!p) return { output: 'GitLab project not configured.' };
          try {
            const glState = state === 'open' ? 'opened' : state;
            const mrs = await this.api<Record<string, unknown>[]>(
              `/projects/${this.encodedProject}/merge_requests?state=${glState}&per_page=15`,
            );
            const mapped = mrs.map(mr => ({
              number:     mr['iid'],
              title:      mr['title'],
              state:      mr['state'],
              draft:      mr['draft'] || (mr['title'] as string || '').toLowerCase().startsWith('draft'),
              created_at: mr['created_at'],
              updated_at: mr['updated_at'],
              url:        mr['web_url'],
            }));
            return { output: JSON.stringify(mapped, null, 2) };
          } catch (err: unknown) {
            return { output: `Failed to list MRs: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      },

      // ── get_file_content ──────────────────────────────────────────────────
      {
        name: 'get_file_content',
        description: 'Read the content of a specific file in the repository.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'File path relative to repo root (e.g. package.json)', required: true },
        ],
        execute: async ({ path }: { path: string }) => {
          if (!p) return { output: 'GitLab project not configured.' };
          try {
            const encoded = encodeURIComponent(path);
            const res = await fetch(
              `${this.baseUrl}/api/v4/projects/${this.encodedProject}/repository/files/${encoded}/raw?ref=HEAD`,
              { headers: { 'User-Agent': 'OpenQA/3.1', ...(this.token ? { 'PRIVATE-TOKEN': this.token } : {}) }, signal: AbortSignal.timeout(10000) },
            );
            if (!res.ok) return { output: `Failed to read ${path}: ${res.status}` };
            const text = await res.text();
            return { output: text.length > 4000 ? text.slice(0, 4000) + '\n[... truncated]' : text };
          } catch (err: unknown) {
            return { output: `Failed to read ${path}: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      },

      // ── list_directory ────────────────────────────────────────────────────
      {
        name: 'list_directory',
        description: 'List files and directories at a path in the repository.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'Directory path (default: root "")', required: false },
        ],
        execute: async ({ path = '' }: { path?: string }) => {
          if (!p) return { output: 'GitLab project not configured.' };
          try {
            const qs = path ? `&path=${encodeURIComponent(path)}` : '';
            const items = await this.api<Record<string, unknown>[]>(
              `/projects/${this.encodedProject}/repository/tree?per_page=50${qs}`,
            );
            const mapped = items.map(f => ({ name: f['name'], type: f['type'], path: f['path'] }));
            return { output: JSON.stringify(mapped, null, 2) };
          } catch (err: unknown) {
            return { output: `Failed to list ${path || 'root'}: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      },

    ];
  }
}
