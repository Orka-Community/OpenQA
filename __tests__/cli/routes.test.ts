import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';
import { OpenQADatabase } from '../../database/index.js';
import { ConfigManager } from '../../agent/config/index.js';
import { createApiRouter } from '../../cli/routes.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function tempDbPath() {
  return join(tmpdir(), `openqa-routes-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanFile(p: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = p + suffix;
    if (existsSync(f)) try { unlinkSync(f); } catch { /* ignore */ }
  }
}

interface AppBundle {
  app: express.Application;
  db: OpenQADatabase;
  dbPath: string;
}

async function makeApp(): Promise<AppBundle> {
  const dbPath = tempDbPath();
  const db = new OpenQADatabase(dbPath);

  // Point ConfigManager's internal DB to the same path
  process.env.DB_PATH = dbPath;
  const config = new ConfigManager();

  const app = express();
  app.use(express.json());
  app.use(createApiRouter(db, config));
  return { app, db, dbPath };
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('API routes', () => {
  let bundle: AppBundle;

  beforeEach(async () => {
    bundle = await makeApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanFile(bundle.dbPath);
  });

  // ── health ────────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(bundle.app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toMatch(/^(ok|degraded)$/);
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.db).toBe('boolean');
    });
  });

  // ── metrics ───────────────────────────────────────────────────────────────────

  describe('GET /api/metrics', () => {
    it('returns snapshot with counters and memory', async () => {
      const res = await request(bundle.app).get('/api/metrics');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('counters');
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('uptimeSeconds');
      expect(res.body).toHaveProperty('cacheHitRate');
    });

    it('http_requests counter increments on each hit', async () => {
      const r1 = await request(bundle.app).get('/api/metrics');
      const before = r1.body.counters.http_requests as number;
      const r2 = await request(bundle.app).get('/api/metrics');
      expect(r2.body.counters.http_requests).toBeGreaterThan(before);
    });
  });

  // ── status ────────────────────────────────────────────────────────────────────

  describe('GET /api/status', () => {
    it('returns { isRunning: true }', async () => {
      const res = await request(bundle.app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body.isRunning).toBe(true);
    });
  });

  // ── sessions ──────────────────────────────────────────────────────────────────

  describe('GET /api/sessions', () => {
    it('returns an empty array when no sessions exist', async () => {
      const res = await request(bundle.app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns created sessions', async () => {
      await bundle.db.createSession('s1');
      await bundle.db.createSession('s2');
      const res = await request(bundle.app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('respects ?limit query param', async () => {
      for (let i = 0; i < 5; i++) await bundle.db.createSession(`sess_limit_${i}`);
      const res = await request(bundle.app).get('/api/sessions?limit=3');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('returns 404 for unknown session', async () => {
      const res = await request(bundle.app).get('/api/sessions/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns the session when it exists', async () => {
      await bundle.db.createSession('known_session');
      const res = await request(bundle.app).get('/api/sessions/known_session');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('known_session');
    });
  });

  describe('GET /api/sessions/:id/actions', () => {
    it('returns empty array for session with no actions', async () => {
      await bundle.db.createSession('no_action_sess');
      const res = await request(bundle.app).get('/api/sessions/no_action_sess/actions');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns actions for a given session', async () => {
      await bundle.db.createSession('action_sess');
      await bundle.db.createAction({
        session_id: 'action_sess',
        type: 'navigate',
        description: 'Go to homepage',
        input: 'https://www.wiloomail.com',
        output: 'Loaded',
      });
      const res = await request(bundle.app).get('/api/sessions/action_sess/actions');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe('navigate');
    });
  });

  // ── bugs ──────────────────────────────────────────────────────────────────────

  describe('GET /api/bugs', () => {
    it('returns empty array when no bugs exist', async () => {
      const res = await request(bundle.app).get('/api/bugs');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns all bugs', async () => {
      await bundle.db.createSession('bug_sess');
      await bundle.db.createBug({
        session_id: 'bug_sess',
        title: 'Login broken',
        description: 'Cannot log in',
        severity: 'high',
        status: 'open',
      });
      const res = await request(bundle.app).get('/api/bugs');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].title).toBe('Login broken');
    });

    it('filters by status when ?status= is given', async () => {
      await bundle.db.createSession('bug_sess2');
      await bundle.db.createBug({ session_id: 'bug_sess2', title: 'Open bug', description: '', severity: 'low', status: 'open' });
      await bundle.db.createBug({ session_id: 'bug_sess2', title: 'Closed bug', description: '', severity: 'low', status: 'closed' });

      const res = await request(bundle.app).get('/api/bugs?status=open');
      expect(res.status).toBe(200);
      expect(res.body.every((b: { status: string }) => b.status === 'open')).toBe(true);
    });
  });

  // ── kanban ────────────────────────────────────────────────────────────────────

  describe('GET /api/kanban', () => {
    it('returns empty array when board is empty', async () => {
      const res = await request(bundle.app).get('/api/kanban');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/kanban', () => {
    it('creates a ticket and returns it', async () => {
      const res = await request(bundle.app)
        .post('/api/kanban')
        .send({ title: 'Fix login', description: 'Login fails on mobile', priority: 'high', column: 'backlog' });

      expect(res.status).toBe(200);
      expect(res.body.id).toMatch(/^ticket_/);
      expect(res.body.title).toBe('Fix login');
      expect(res.body.priority).toBe('high');
    });

    it('uses defaults when optional fields are omitted', async () => {
      const res = await request(bundle.app).post('/api/kanban').send({});
      expect(res.status).toBe(200);
      expect(res.body.column).toBeDefined();
    });

    it('rejects invalid priority value', async () => {
      const res = await request(bundle.app)
        .post('/api/kanban')
        .send({ priority: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/kanban/:id', () => {
    it('updates a ticket column', async () => {
      const ticket = await bundle.db.createKanbanTicket({ title: 'Move me', description: '', priority: 'low', column: 'backlog' });

      const res = await request(bundle.app)
        .put(`/api/kanban/${ticket.id}`)
        .send({ column: 'todo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const all = await bundle.db.getKanbanTickets();
      const updated = all.find(t => t.id === ticket.id);
      expect(updated?.column).toBe('todo');
    });
  });

  describe('DELETE /api/kanban/:id', () => {
    it('deletes a ticket', async () => {
      const ticket = await bundle.db.createKanbanTicket({ title: 'Delete me', description: '', priority: 'low', column: 'backlog' });

      const res = await request(bundle.app).delete(`/api/kanban/${ticket.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const all = await bundle.db.getKanbanTickets();
      expect(all.find(t => t.id === ticket.id)).toBeUndefined();
    });
  });

  describe('PATCH /api/kanban/tickets/:id', () => {
    it('updates a ticket via PATCH', async () => {
      const ticket = await bundle.db.createKanbanTicket({ title: 'Patch me', description: '', priority: 'low', column: 'backlog' });

      const res = await request(bundle.app)
        .patch(`/api/kanban/tickets/${ticket.id}`)
        .send({ priority: 'critical' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── config ────────────────────────────────────────────────────────────────────

  describe('GET /api/config', () => {
    it('returns a config object', async () => {
      const res = await request(bundle.app).get('/api/config');
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
    });
  });

  describe('POST /api/config', () => {
    it('stores a config key and returns success', async () => {
      const res = await request(bundle.app)
        .post('/api/config')
        .send({ web: { port: '8080' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/config/reset', () => {
    it('clears all config and returns success', async () => {
      // Store something first
      await request(bundle.app).post('/api/config').send({ web: { port: '9000' } });

      const res = await request(bundle.app).post('/api/config/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── test-connection ───────────────────────────────────────────────────────────

  describe('POST /api/test-connection', () => {
    it('returns 400 when url is missing', async () => {
      const res = await request(bundle.app).post('/api/test-connection').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns success result when URL is reachable (mocked)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      }));

      const res = await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://www.wiloomail.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(200);
      expect(res.body.category).toBe('ok');
      expect(typeof res.body.latency).toBe('number');
    });

    it('returns auth_failed category for 401 response (mocked)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }));

      const res = await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://protected.example.com' });

      expect(res.body.success).toBe(false);
      expect(res.body.category).toBe('auth_failed');
    });

    it('returns not_found category for 404 (mocked)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));

      const res = await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://example.com/missing' });

      expect(res.body.category).toBe('not_found');
    });

    it('returns server_error category for 500 (mocked)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false }));

      const res = await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://broken.example.com' });

      expect(res.body.category).toBe('server_error');
    });

    it('returns network_error on fetch exception (mocked)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const res = await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://offline.example.com' });

      expect(res.body.success).toBe(false);
      expect(res.body.category).toBe('network_error');
    });

    it('sends Basic auth header when authType=basic (mocked)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://www.wiloomail.com', authType: 'basic', username: 'user', password: 'pass' });

      const callHeaders = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(callHeaders?.['Authorization']).toMatch(/^Basic /);
    });

    it('sends Bearer auth header when authType=bearer (mocked)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://www.wiloomail.com', authType: 'bearer', token: 'mytoken123' });

      const callHeaders = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(callHeaders?.['Authorization']).toBe('Bearer mytoken123');
    });

    it('falls back to GET when HEAD returns 405 (mocked)', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 405, ok: false }) // HEAD → 405
        .mockResolvedValueOnce({ status: 200, ok: true });  // GET → 200

      vi.stubGlobal('fetch', mockFetch);

      const res = await request(bundle.app)
        .post('/api/test-connection')
        .send({ url: 'https://www.wiloomail.com' });

      expect(res.body.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ── test-github ───────────────────────────────────────────────────────────────

  describe('POST /api/test-github', () => {
    it('returns failure when GITHUB_OWNER/REPO are not configured', async () => {
      // Ensure env vars are unset
      const savedOwner = process.env.GITHUB_OWNER;
      const savedRepo = process.env.GITHUB_REPO;
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;

      const res = await request(bundle.app).post('/api/test-github').send({});

      process.env.GITHUB_OWNER = savedOwner;
      process.env.GITHUB_REPO = savedRepo;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/GITHUB_OWNER.*GITHUB_REPO|must both be set/i);
    });

    it('returns success for a valid public repo (mocked)', async () => {
      process.env.GITHUB_OWNER = 'Orka-Community';
      process.env.GITHUB_REPO = 'paper2any';
      delete process.env.GITHUB_TOKEN;

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ private: false, full_name: 'Orka-Community/paper2any' }),
      }));

      const res = await request(bundle.app).post('/api/test-github').send({});

      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Orka-Community/paper2any');
      expect(res.body.message).toContain('public');
    });

    it('returns failure when repo is not found (mocked 404)', async () => {
      process.env.GITHUB_OWNER = 'Orka-Community';
      process.env.GITHUB_REPO = 'paper2any';
      delete process.env.GITHUB_TOKEN;

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));

      const res = await request(bundle.app).post('/api/test-github').send({});

      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('returns token-auth failure on 401 (mocked)', async () => {
      process.env.GITHUB_OWNER = 'Orka-Community';
      process.env.GITHUB_REPO = 'paper2any';
      process.env.GITHUB_TOKEN = 'bad-token';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));

      const res = await request(bundle.app).post('/api/test-github').send({});

      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
      delete process.env.GITHUB_TOKEN;

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid|expired|token/i);
    });

    it('returns network error when GitHub is unreachable (mocked)', async () => {
      process.env.GITHUB_OWNER = 'Orka-Community';
      process.env.GITHUB_REPO = 'paper2any';

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unreachable')));

      const res = await request(bundle.app).post('/api/test-github').send({});

      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/network|unreachable/i);
    });
  });
});
