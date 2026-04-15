/**
 * Integration test suite — Case 1: Target URL (www.wiloomail.com)
 *
 * Tests OpenQA behaviour when configured with a target SaaS URL instead of
 * a GitHub repository.  Network calls are mocked so the suite remains fast
 * and deterministic in CI without real network access.
 *
 * Target: https://www.wiloomail.com
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
import { SaaSConfigManager, createQuickConfig } from '../../agent/config/saas-config.js';
import { ExportService } from '../../agent/export/index.js';

const TARGET_URL = 'https://www.wiloomail.com';

// ── helpers ────────────────────────────────────────────────────────────────────

function tempDbPath() {
  return join(tmpdir(), `openqa-case1-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanFile(p: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = p + suffix;
    if (existsSync(f)) try { unlinkSync(f); } catch { /* ignore */ }
  }
}

async function makeApp(dbPath: string) {
  const db = new OpenQADatabase(dbPath);
  process.env.DB_PATH = dbPath;
  process.env.SAAS_URL = TARGET_URL;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_OWNER;
  const config = new ConfigManager();
  const app = express();
  app.use(express.json());
  app.use(createApiRouter(db, config));
  return { app, db, config };
}

// ── suite ──────────────────────────────────────────────────────────────────────

describe('Case 1 — Target URL: www.wiloomail.com', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanFile(dbPath);
    delete process.env.SAAS_URL;
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_OWNER;
  });

  // ── 1.1 ConfigManager reads SAAS_URL ────────────────────────────────────────

  describe('1.1 ConfigManager — SAAS_URL env var', () => {
    it('getConfigSync() exposes the target URL under saas.url', () => {
      process.env.SAAS_URL = TARGET_URL;
      const mgr = new ConfigManager();
      expect(mgr.getConfigSync().saas?.url).toBe(TARGET_URL);
    });

    it('github fields are empty when only SAAS_URL is configured', () => {
      process.env.SAAS_URL = TARGET_URL;
      delete process.env.GITHUB_REPO;
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('');
      expect(cfg.github?.repo).toBe('');
    });

    it('getAll() includes saas.url from env', async () => {
      process.env.SAAS_URL = TARGET_URL;
      process.env.DB_PATH = dbPath;
      const mgr = new ConfigManager();
      const all = await mgr.getAll();
      expect((all as Record<string, unknown> & { saas?: { url: string } }).saas?.url).toBe(TARGET_URL);
    });

    it('can persist saas config via set()', async () => {
      process.env.DB_PATH = dbPath;
      const mgr = new ConfigManager();
      await mgr.set('saas.url', TARGET_URL);
      const val = await mgr.get('saas.url');
      expect(val).toBe(TARGET_URL);
    });
  });

  // ── 1.2 SaaSConfigManager with wiloomail.com ─────────────────────────────────

  describe('1.2 SaaSConfigManager — configure() with target URL', () => {
    it('configures the SaaS app with wiloomail.com', async () => {
      const db = new OpenQADatabase(dbPath);
      const mgr = new SaaSConfigManager(db);
      await new Promise(r => setTimeout(r, 10));

      const cfg = await mgr.configure({
        name: 'WilooMail',
        description: 'Email SaaS platform for automated QA testing',  // required by schema
        url: TARGET_URL,
        directives: [
          'Test login and registration flows',
          'Verify email composition and sending',
          'Check inbox pagination',
        ],
      });

      expect(cfg.url).toBe(TARGET_URL);
      expect(cfg.name).toBe('WilooMail');
      expect(cfg.directives).toHaveLength(3);
      expect(mgr.isConfigured()).toBe(true);
    });

    it('setRepoUrl can link a GitHub repo to the target SaaS', async () => {
      const db = new OpenQADatabase(dbPath);
      const mgr = new SaaSConfigManager(db);
      await new Promise(r => setTimeout(r, 10));
      await mgr.configure({ name: 'WilooMail', description: 'Test application', url: TARGET_URL });
      await mgr.setRepoUrl('https://github.com/Orka-Community/paper2any');

      const cfg = await mgr.getConfig();
      expect(cfg?.repoUrl).toBe('https://github.com/Orka-Community/paper2any');
    });

    it('directives can be added and removed', async () => {
      const db = new OpenQADatabase(dbPath);
      const mgr = new SaaSConfigManager(db);
      await new Promise(r => setTimeout(r, 10));
      await mgr.configure({ name: 'WilooMail', description: 'Test application', url: TARGET_URL, directives: ['Check inbox'] });
      await mgr.addDirective('Test compose email');
      await mgr.addDirective('Verify attachments');

      let cfg = await mgr.getConfig();
      expect(cfg?.directives).toHaveLength(3);

      await mgr.removeDirective(0); // remove 'Check inbox'
      cfg = await mgr.getConfig();
      expect(cfg?.directives).not.toContain('Check inbox');
      expect(cfg?.directives).toContain('Test compose email');
    });
  });

  // ── 1.3 createQuickConfig helper ────────────────────────────────────────────

  describe('1.3 createQuickConfig() for the target URL', () => {
    it('produces a valid SaaSConfig for wiloomail.com', () => {
      const cfg = createQuickConfig('WilooMail', 'Email automation', TARGET_URL);
      expect(cfg.url).toBe(TARGET_URL);
      expect(cfg.name).toBe('WilooMail');
      expect(cfg.authInfo?.type).toBe('none');
      expect(cfg.directives!.length).toBeGreaterThan(0);
    });

    it('custom directives override defaults', () => {
      const custom = ['Login', 'Inbox', 'Compose'];
      const cfg = createQuickConfig('WilooMail', 'Email', TARGET_URL, { directives: custom });
      expect(cfg.directives).toEqual(custom);
    });

    it('can attach the GitHub repo', () => {
      const cfg = createQuickConfig('WilooMail', 'Email', TARGET_URL, {
        repoUrl: 'https://github.com/Orka-Community/paper2any',
      });
      expect(cfg.repoUrl).toBe('https://github.com/Orka-Community/paper2any');
    });
  });

  // ── 1.4 /api/test-connection with wiloomail.com ──────────────────────────────

  describe('1.4 /api/test-connection with wiloomail.com', () => {
    it('succeeds when URL is reachable (mocked HTTP 200)', async () => {
      const { app } = await makeApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));

      const res = await request(app)
        .post('/api/test-connection')
        .send({ url: TARGET_URL });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBe('ok');
      expect(res.body.message).toContain('200');
    });

    it('returns auth_failed when server returns 401', async () => {
      const { app } = await makeApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }));

      const res = await request(app)
        .post('/api/test-connection')
        .send({ url: TARGET_URL });

      expect(res.body.success).toBe(false);
      expect(res.body.category).toBe('auth_failed');
    });

    it('sends Basic auth when credentials are provided', async () => {
      const { app } = await makeApp(dbPath);
      const mockFetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await request(app)
        .post('/api/test-connection')
        .send({ url: TARGET_URL, authType: 'basic', username: 'user@wiloomail.com', password: 'secret' });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers?.['Authorization']).toMatch(/^Basic /);
      expect(res => res).toBeDefined();
    });

    it('returns network_error when URL is unreachable (mocked)', async () => {
      const { app } = await makeApp(dbPath);

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

      const res = await request(app)
        .post('/api/test-connection')
        .send({ url: TARGET_URL });

      expect(res.body.success).toBe(false);
      expect(res.body.category).toBe('network_error');
    });

    it('returns 400 when URL is omitted', async () => {
      const { app } = await makeApp(dbPath);

      const res = await request(app).post('/api/test-connection').send({});
      expect(res.status).toBe(400);
    });
  });

  // ── 1.5 /api/test-github returns not-configured in URL-only mode ──────────────

  describe('1.5 /api/test-github is not-configured in URL-only mode', () => {
    it('returns failure because GITHUB_OWNER/REPO are absent', async () => {
      const { app } = await makeApp(dbPath);

      const res = await request(app).post('/api/test-github').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/GITHUB_OWNER|GITHUB_REPO|must both be set/i);
    });
  });

  // ── 1.6 Full session flow for target URL ─────────────────────────────────────

  describe('1.6 Full session + bug + kanban flow', () => {
    it('creates session, actions, bug, and kanban ticket — then exports as JSON', async () => {
      const db = new OpenQADatabase(dbPath);

      // Simulate an agent session against wiloomail.com
      await db.createSession('wiloomail_sess_01');
      await db.createAction({
        session_id: 'wiloomail_sess_01',
        type: 'navigate',
        description: `Navigate to ${TARGET_URL}`,
        input: TARGET_URL,
        output: 'Page title: WilooMail — Your Smart Inbox',
      });
      await db.createAction({
        session_id: 'wiloomail_sess_01',
        type: 'click',
        description: 'Click on Login button',
        input: 'button[data-qa="login"]',
        output: 'Login modal opened',
      });
      await db.createAction({
        session_id: 'wiloomail_sess_01',
        type: 'fill',
        description: 'Fill login form',
        input: '{"email":"qa@test.com","password":"Test1234"}',
        output: 'Form filled',
      });

      const bug = await db.createBug({
        session_id: 'wiloomail_sess_01',
        title: 'Login form: password field accepts spaces only',
        description: 'Entering only whitespace in the password field bypasses validation.',
        severity: 'high',
        status: 'open',
      });

      const ticket = await db.createKanbanTicket({
        title: 'Fix: password whitespace validation',
        description: 'Bug ref: ' + bug.id,
        priority: 'high',
        column: 'to-do',
      });

      await db.updateSession('wiloomail_sess_01', { status: 'completed', total_actions: 3, bugs_found: 1 });

      // Verify session state
      const session = await db.getSession('wiloomail_sess_01');
      expect(session?.status).toBe('completed');
      expect(session?.bugs_found).toBe(1);

      const actions = await db.getSessionActions('wiloomail_sess_01');
      expect(actions).toHaveLength(3);

      const bugs = await db.getAllBugs();
      expect(bugs.some(b => b.id === bug.id)).toBe(true);

      const tickets = await db.getKanbanTickets();
      expect(tickets.some(t => t.id === ticket.id)).toBe(true);

      // Export as JSON
      const exporter = new ExportService(db);
      const exported = await exporter.exportSession('wiloomail_sess_01', 'json');
      const data = JSON.parse(exported.content);

      expect(data.session.id).toBe('wiloomail_sess_01');
      expect(data.actions).toHaveLength(3);
      expect(data.bugs).toHaveLength(1);
      expect(data.bugs[0].title).toContain('password');
    });

    it('can filter bugs by severity', async () => {
      const db = new OpenQADatabase(dbPath);
      await db.createSession('wiloomail_filter_sess');

      await db.createBug({ session_id: 'wiloomail_filter_sess', title: 'Critical XSS', description: 'Test application', severity: 'critical', status: 'open' });
      await db.createBug({ session_id: 'wiloomail_filter_sess', title: 'Minor UI glitch', description: 'Test application', severity: 'low', status: 'open' });

      const allBugs = await db.getAllBugs();
      const criticalBugs = allBugs.filter(b => b.severity === 'critical');

      expect(criticalBugs).toHaveLength(1);
      expect(criticalBugs[0].title).toBe('Critical XSS');
    });

    it('kanban board shows correct column counts after seeding', async () => {
      const db = new OpenQADatabase(dbPath);

      await db.createKanbanTicket({ title: 'Backlog 1', description: 'Test application', priority: 'low', column: 'backlog' });
      await db.createKanbanTicket({ title: 'Backlog 2', description: 'Test application', priority: 'low', column: 'backlog' });
      await db.createKanbanTicket({ title: 'In Progress', description: 'Test application', priority: 'high', column: 'in-progress' });
      await db.createKanbanTicket({ title: 'Done', description: 'Test application', priority: 'low', column: 'done' });

      const backlog = await db.getKanbanTicketsByColumn('backlog');
      const inProgress = await db.getKanbanTicketsByColumn('in-progress');
      const done = await db.getKanbanTicketsByColumn('done');

      expect(backlog).toHaveLength(2);
      expect(inProgress).toHaveLength(1);
      expect(done).toHaveLength(1);
    });
  });
});
