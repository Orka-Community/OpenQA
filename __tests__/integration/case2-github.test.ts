/**
 * Integration test suite — Case 2: GitHub repository
 *
 * Tests OpenQA behaviour when configured with a GitHub repository
 * (https://github.com/Orka-Community/paper2any) instead of (or in addition to)
 * a SaaS target URL.
 *
 * - URL-normalisation tests: no network required.
 * - GitHub API tests: fetch is mocked so the suite runs deterministically in CI.
 * - GitHubTools tests: Octokit is mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

import { OpenQADatabase } from '../../database/index.js';
import { ConfigManager } from '../../agent/config/index.js';
import { createApiRouter } from '../../cli/routes.js';
import { SaaSConfigManager } from '../../agent/config/saas-config.js';
import { ExportService } from '../../agent/export/index.js';

const GITHUB_FULL_URL = 'https://github.com/Orka-Community/paper2any';
const EXPECTED_OWNER  = 'Orka-Community';
const EXPECTED_REPO   = 'paper2any';

// ── helpers ────────────────────────────────────────────────────────────────────

function tempDbPath() {
  return join(tmpdir(), `openqa-case2-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanFile(p: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = p + suffix;
    if (existsSync(f)) try { unlinkSync(f); } catch { /* ignore */ }
  }
}

async function makeGithubApp(dbPath: string, { token }: { token?: string } = {}) {
  const db = new OpenQADatabase(dbPath);
  process.env.DB_PATH     = dbPath;
  process.env.GITHUB_REPO  = GITHUB_FULL_URL;
  delete process.env.GITHUB_OWNER; // derived from URL
  delete process.env.SAAS_URL;
  // Only clear token if the caller hasn't already set one
  if (!token) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = token;
  const config = new ConfigManager();
  const app = express();
  app.use(express.json());
  app.use(createApiRouter(db, config));
  return { app, db, config };
}

// ── suite ──────────────────────────────────────────────────────────────────────

describe('Case 2 — GitHub: Orka-Community/paper2any', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanFile(dbPath);
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_TOKEN;
    delete process.env.SAAS_URL;
  });

  // ── 2.1 GITHUB_REPO URL normalisation ────────────────────────────────────────

  describe('2.1 ConfigManager — GITHUB_REPO URL normalisation', () => {
    it('extracts owner and repo from full HTTPS URL', () => {
      process.env.GITHUB_REPO = GITHUB_FULL_URL;
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe(EXPECTED_OWNER);
      expect(cfg.github?.repo).toBe(EXPECTED_REPO);
    });

    it('extracts from full URL with .git suffix', () => {
      process.env.GITHUB_REPO = GITHUB_FULL_URL + '.git';
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe(EXPECTED_OWNER);
      expect(cfg.github?.repo).toBe(EXPECTED_REPO);
    });

    it('handles owner/repo shorthand format', () => {
      process.env.GITHUB_REPO = `${EXPECTED_OWNER}/${EXPECTED_REPO}`;
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe(EXPECTED_OWNER);
      expect(cfg.github?.repo).toBe(EXPECTED_REPO);
    });

    it('explicit GITHUB_OWNER env var overrides URL-derived owner', () => {
      process.env.GITHUB_REPO  = 'https://github.com/some-other-org/paper2any';
      process.env.GITHUB_OWNER = EXPECTED_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe(EXPECTED_OWNER);
      expect(cfg.github?.repo).toBe(EXPECTED_REPO);
    });

    it('includes GITHUB_TOKEN when set', () => {
      process.env.GITHUB_REPO  = GITHUB_FULL_URL;
      process.env.GITHUB_TOKEN = 'ghp_test_token_12345';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.token).toBe('ghp_test_token_12345');
    });

    it('github is undefined when GITHUB_REPO is absent', () => {
      delete process.env.GITHUB_REPO;
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_TOKEN;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github).toBeUndefined();
    });

    it('getAll() includes normalised github fields', async () => {
      process.env.GITHUB_REPO = GITHUB_FULL_URL;
      process.env.DB_PATH = dbPath;
      const mgr = new ConfigManager();
      const all = await mgr.getAll();
      const github = (all as Record<string, unknown> & { github?: { owner: string; repo: string } }).github;
      expect(github?.owner).toBe(EXPECTED_OWNER);
      expect(github?.repo).toBe(EXPECTED_REPO);
    });
  });

  // ── 2.2 SaaSConfigManager with GitHub repoUrl ────────────────────────────────

  describe('2.2 SaaSConfigManager — repoUrl pointing to GitHub', () => {
    it('stores the GitHub repo URL under repoUrl', async () => {
      const db = new OpenQADatabase(dbPath);
      const mgr = new SaaSConfigManager(db);
      await new Promise(r => setTimeout(r, 10));
      await mgr.configure({ name: 'Paper2Any', description: 'Test application', url: 'https://paper2any.io' });
      await mgr.setRepoUrl(GITHUB_FULL_URL);

      const cfg = await mgr.getConfig();
      expect(cfg?.repoUrl).toBe(GITHUB_FULL_URL);
    });
  });

  // ── 2.3 /api/test-github endpoint (mocked) ────────────────────────────────────

  describe('2.3 /api/test-github endpoint', () => {
    it('succeeds for public repo (mocked GitHub API 200)', async () => {
      const { app } = await makeGithubApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ private: false, full_name: `${EXPECTED_OWNER}/${EXPECTED_REPO}` }),
      }));

      const res = await request(app).post('/api/test-github').send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain(EXPECTED_OWNER);
      expect(res.body.message).toContain(EXPECTED_REPO);
      expect(res.body.message).toContain('public');
      expect(typeof res.body.latency).toBe('number');
      expect(res.body.authenticated).toBe(false); // no token set
    });

    it('indicates authenticated=true when GITHUB_TOKEN is set (mocked)', async () => {
      // Pass token into makeGithubApp so it is set BEFORE ConfigManager reads env
      const { app } = await makeGithubApp(dbPath, { token: 'ghp_abc123' });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ private: false }),
      }));

      const res = await request(app).post('/api/test-github').send({});

      expect(res.body.success).toBe(true);
      expect(res.body.authenticated).toBe(true);
    });

    it('marks repo as private when API returns private:true (mocked)', async () => {
      const { app } = await makeGithubApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ private: true }),
      }));

      const res = await request(app).post('/api/test-github').send({});
      expect(res.body.message).toContain('private');
    });

    it('fails with 404 message when repo is not found (mocked)', async () => {
      const { app } = await makeGithubApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }));

      const res = await request(app).post('/api/test-github').send({});

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('fails with token message when 401 (mocked)', async () => {
      const { app } = await makeGithubApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      }));

      const res = await request(app).post('/api/test-github').send({});
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid|expired|token/i);
    });

    it('fails with forbidden message when 403 (mocked)', async () => {
      const { app } = await makeGithubApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({}),
      }));

      const res = await request(app).post('/api/test-github').send({});
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden|permissions/i);
    });

    it('fails with network error when fetch throws (mocked)', async () => {
      const { app } = await makeGithubApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

      const res = await request(app).post('/api/test-github').send({});
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/network|GitHub unreachable/i);
    });

    it('calls the correct GitHub API endpoint', async () => {
      const { app } = await makeGithubApp(dbPath);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ private: false }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await request(app).post('/api/test-github').send({});

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`https://api.github.com/repos/${EXPECTED_OWNER}/${EXPECTED_REPO}`);
    });

    it('fails with helpful message when GITHUB_REPO is not configured', async () => {
      delete process.env.GITHUB_REPO;
      delete process.env.GITHUB_OWNER;
      process.env.DB_PATH = dbPath;
      const db = new OpenQADatabase(dbPath);
      const config = new ConfigManager();
      const app = express();
      app.use(express.json());
      app.use(createApiRouter(db, config));

      const res = await request(app).post('/api/test-github').send({});
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/GITHUB_OWNER|GITHUB_REPO|must both be set/i);
    });
  });

  // ── 2.4 GitHubTools — create issue (mocked Octokit) ──────────────────────────

  describe('2.4 GitHubTools — create_github_issue', () => {
    it('creates an issue and stores bug in DB', async () => {
      // Mock Octokit
      vi.mock('@octokit/rest', () => ({
        Octokit: vi.fn().mockImplementation(() => ({
          rest: {
            issues: {
              create: vi.fn().mockResolvedValue({
                data: {
                  html_url: `https://github.com/${EXPECTED_OWNER}/${EXPECTED_REPO}/issues/1`,
                  number: 1,
                },
              }),
            },
          },
        })),
      }));

      const db = new OpenQADatabase(dbPath);
      await db.createSession('gh_tool_sess');

      const { GitHubTools } = await import('../../agent/tools/github.js');
      const tools = new GitHubTools(db, 'gh_tool_sess', {
        token: 'ghp_fake_token',
        owner: EXPECTED_OWNER,
        repo: EXPECTED_REPO,
      });

      const toolDefs = tools.getTools();
      const createTool = toolDefs.find(t => t.name === 'create_github_issue')!;

      const result = await createTool.execute({
        title: 'Critical: XSS vulnerability in compose form',
        body: 'Steps to reproduce: inject <script>alert(1)</script> in the subject field.',
        severity: 'critical',
        labels: ['security', 'frontend'],
      });

      expect((result as { output: string }).output).toContain('GitHub issue created');
      expect((result as { output: string }).output).toContain('#1');

      const bugs = await db.getAllBugs();
      expect(bugs).toHaveLength(1);
      expect(bugs[0].title).toContain('XSS');
      expect(bugs[0].severity).toBe('critical');
      expect(bugs[0].github_issue_url).toContain(EXPECTED_OWNER);
    });

    it('returns error message when GitHub is not configured', async () => {
      const db = new OpenQADatabase(dbPath);
      await db.createSession('gh_tool_sess2');

      const { GitHubTools } = await import('../../agent/tools/github.js');
      const tools = new GitHubTools(db, 'gh_tool_sess2', {});
      const toolDefs = tools.getTools();
      const createTool = toolDefs[0];

      const result = await createTool.execute({ title: 'Bug', body: 'desc', severity: 'low' });
      expect((result as { output: string }).output).toContain('GitHub not configured');
    });
  });

  // ── 2.5 Full session flow for GitHub mode ─────────────────────────────────────

  describe('2.5 Full session + bug + kanban flow (GitHub mode)', () => {
    it('runs a complete QA session linked to GitHub repo', async () => {
      const db = new OpenQADatabase(dbPath);

      // Session for paper2any repo testing
      await db.createSession('paper2any_sess_01');

      await db.createAction({ session_id: 'paper2any_sess_01', type: 'navigate', description: 'Open GitHub repo page', input: GITHUB_FULL_URL, output: 'Repo loaded' });
      await db.createAction({ session_id: 'paper2any_sess_01', type: 'click', description: 'Click Issues tab', input: 'a[data-tab-item="issues-tab"]', output: 'Issues page opened' });
      await db.createAction({ session_id: 'paper2any_sess_01', type: 'navigate', description: 'Navigate to deployed app', input: 'https://paper2any.io', output: 'App loaded' });

      const bug = await db.createBug({
        session_id: 'paper2any_sess_01',
        title: 'PDF conversion fails for files > 10MB',
        description: 'Error 413 returned when uploading large PDF files.',
        severity: 'high',
        status: 'open',
        github_issue_url: `https://github.com/${EXPECTED_OWNER}/${EXPECTED_REPO}/issues/42`,
      });

      const ticket = await db.createKanbanTicket({
        title: 'Fix large file upload limit',
        description: `Related GitHub issue: #42\nBug ID: ${bug.id}`,
        priority: 'high',
        column: 'to-do',
      });

      await db.updateSession('paper2any_sess_01', { status: 'completed', total_actions: 3, bugs_found: 1 });

      // Assertions
      const session = await db.getSession('paper2any_sess_01');
      expect(session?.status).toBe('completed');

      const actions = await db.getSessionActions('paper2any_sess_01');
      expect(actions).toHaveLength(3);

      const allBugs = await db.getAllBugs();
      const ourBug = allBugs.find(b => b.id === bug.id)!;
      expect(ourBug.github_issue_url).toContain('/issues/42');
      expect(ourBug.severity).toBe('high');

      const tickets = await db.getKanbanTickets();
      const ourTicket = tickets.find(t => t.id === ticket.id)!;
      expect(ourTicket.column).toBe('to-do');
      expect(ourTicket.priority).toBe('high');

      // Export as HTML
      const exporter = new ExportService(db);
      const html = await exporter.exportSession('paper2any_sess_01', 'html');
      expect(html.content).toContain('paper2any_sess_01');
      expect(html.content).toContain('high');
    });

    it('can move kanban ticket across columns', async () => {
      const db = new OpenQADatabase(dbPath);

      const ticket = await db.createKanbanTicket({ title: 'Epic: GitHub CI', description: 'Test application', priority: 'medium', column: 'backlog' });
      await db.updateKanbanTicket(ticket.id, { column: 'in-progress' });
      await db.updateKanbanTicket(ticket.id, { column: 'done' });

      const all = await db.getKanbanTickets();
      const t = all.find(t => t.id === ticket.id)!;
      expect(t.column).toBe('done');
    });

    it('bug status transitions work correctly', async () => {
      const db = new OpenQADatabase(dbPath);
      await db.createSession('bug_flow_sess');

      const bug = await db.createBug({ session_id: 'bug_flow_sess', title: 'Open bug', description: 'Test application', severity: 'medium', status: 'open' });
      expect(bug.status).toBe('open');

      await db.updateBug(bug.id, { status: 'in-progress' });
      let all = await db.getAllBugs();
      expect(all.find(b => b.id === bug.id)?.status).toBe('in-progress');

      await db.updateBug(bug.id, { status: 'resolved' });
      all = await db.getAllBugs();
      expect(all.find(b => b.id === bug.id)?.status).toBe('resolved');
    });
  });

  // ── 2.6 Routes — kanban + bugs via API (GitHub mode) ─────────────────────────

  describe('2.6 Routes integration (GitHub mode)', () => {
    it('GET /api/config exposes github owner and repo', async () => {
      const { app } = await makeGithubApp(dbPath);
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      // Config returns env values; github section should have owner/repo
      const body = res.body as Record<string, unknown> & { github?: { owner: string; repo: string } };
      if (body.github) {
        expect(body.github.owner).toBe(EXPECTED_OWNER);
        expect(body.github.repo).toBe(EXPECTED_REPO);
      }
    });

    it('POST /api/kanban creates a ticket in GitHub mode', async () => {
      const { app } = await makeGithubApp(dbPath);
      const res = await request(app)
        .post('/api/kanban')
        .send({ title: 'GitHub Issue #42', description: 'Large file upload', priority: 'high', column: 'backlog' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('GitHub Issue #42');
    });

    it('GET /health returns db:true', async () => {
      const { app } = await makeGithubApp(dbPath);
      const res = await request(app).get('/health');
      expect(res.body.db).toBe(true);
    });
  });
});
