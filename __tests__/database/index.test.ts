import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenQADatabase } from '../../database/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function tempDbPath() {
  return join(tmpdir(), `openqa-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe('OpenQADatabase', () => {
  let db: OpenQADatabase;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = new OpenQADatabase(dbPath);
  });

  afterEach(() => {
    if (existsSync(dbPath)) {
      try { unlinkSync(dbPath); } catch {}
    }
  });

  // ─── Config ───

  describe('config', () => {
    it('should set and get a config value', async () => {
      await db.setConfig('test.key', 'hello');
      const val = await db.getConfig('test.key');
      expect(val).toBe('hello');
    });

    it('should return null for nonexistent key', async () => {
      const val = await db.getConfig('nonexistent');
      expect(val).toBeNull();
    });

    it('should return all config entries', async () => {
      await db.setConfig('a', '1');
      await db.setConfig('b', '2');
      const all = await db.getAllConfig();
      expect(all).toEqual({ a: '1', b: '2' });
    });

    it('should clear all config', async () => {
      await db.setConfig('x', 'y');
      await db.clearAllConfig();
      const all = await db.getAllConfig();
      expect(all).toEqual({});
    });
  });

  // ─── Sessions ───

  describe('sessions', () => {
    it('should create and retrieve a session', async () => {
      const session = await db.createSession('session_1');
      expect(session.id).toBe('session_1');
      expect(session.status).toBe('running');
      expect(session.total_actions).toBe(0);

      const found = await db.getSession('session_1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('session_1');
    });

    it('should create a session with metadata', async () => {
      const session = await db.createSession('session_meta', { trigger: 'manual' });
      expect(session.metadata).toBe(JSON.stringify({ trigger: 'manual' }));
    });

    it('should return null for nonexistent session', async () => {
      const found = await db.getSession('nonexistent');
      expect(found).toBeNull();
    });

    it('should update a session', async () => {
      await db.createSession('session_update');
      await db.updateSession('session_update', { status: 'completed', total_actions: 5 });

      const found = await db.getSession('session_update');
      expect(found!.status).toBe('completed');
      expect(found!.total_actions).toBe(5);
    });

    it('should return recent sessions sorted by time', async () => {
      await db.createSession('s1');
      await db.createSession('s2');
      await db.createSession('s3');

      const recent = await db.getRecentSessions(2);
      expect(recent).toHaveLength(2);
    });
  });

  // ─── Actions ───

  describe('actions', () => {
    it('should create and retrieve actions', async () => {
      await db.createSession('action_session');
      const action = await db.createAction({
        session_id: 'action_session',
        type: 'navigate',
        description: 'Went to home page',
        input: 'https://example.com',
        output: 'Page loaded',
      });

      expect(action.id).toMatch(/^action_/);
      expect(action.type).toBe('navigate');

      const actions = await db.getSessionActions('action_session');
      expect(actions).toHaveLength(1);
      expect(actions[0].description).toBe('Went to home page');
    });

    it('should return empty array for session with no actions', async () => {
      const actions = await db.getSessionActions('empty');
      expect(actions).toEqual([]);
    });
  });

  // ─── Bugs ───

  describe('bugs', () => {
    it('should create a bug', async () => {
      const bug = await db.createBug({
        session_id: 'bug_session',
        title: 'Button broken',
        description: 'Submit button does not work',
        severity: 'high',
        status: 'open',
      });

      expect(bug.id).toMatch(/^bug_/);
      expect(bug.severity).toBe('high');
      expect(bug.created_at).toBeDefined();
    });

    it('should update a bug', async () => {
      const bug = await db.createBug({
        session_id: 's1',
        title: 'Fix me',
        description: 'desc',
        severity: 'low',
        status: 'open',
      });

      await db.updateBug(bug.id, { status: 'resolved' });
      const all = await db.getAllBugs();
      const updated = all.find(b => b.id === bug.id);
      expect(updated!.status).toBe('resolved');
    });

    it('should filter bugs by status', async () => {
      await db.createBug({ session_id: 's1', title: 'Open', description: '', severity: 'low', status: 'open' });
      await db.createBug({ session_id: 's1', title: 'Closed', description: '', severity: 'low', status: 'closed' });

      const open = await db.getBugsByStatus('open');
      expect(open).toHaveLength(1);
      expect(open[0].title).toBe('Open');
    });
  });

  // ─── Kanban Tickets ───

  describe('kanban tickets', () => {
    it('should create a ticket', async () => {
      const ticket = await db.createKanbanTicket({
        title: 'Test ticket',
        description: 'A test',
        priority: 'medium',
        column: 'to-do',
      });

      expect(ticket.id).toMatch(/^ticket_/);
      expect(ticket.column).toBe('to-do');
    });

    it('should update a ticket', async () => {
      const ticket = await db.createKanbanTicket({
        title: 'Move me',
        description: '',
        priority: 'high',
        column: 'backlog',
      });

      await db.updateKanbanTicket(ticket.id, { column: 'in-progress' });
      const all = await db.getKanbanTickets();
      const updated = all.find(t => t.id === ticket.id);
      expect(updated!.column).toBe('in-progress');
    });

    it('should filter tickets by column', async () => {
      await db.createKanbanTicket({ title: 'A', description: '', priority: 'low', column: 'done' });
      await db.createKanbanTicket({ title: 'B', description: '', priority: 'low', column: 'backlog' });

      const done = await db.getKanbanTicketsByColumn('done');
      expect(done).toHaveLength(1);
      expect(done[0].title).toBe('A');
    });

    it('should list all tickets', async () => {
      await db.createKanbanTicket({ title: 'T1', description: '', priority: 'low', column: 'to-do' });
      await db.createKanbanTicket({ title: 'T2', description: '', priority: 'high', column: 'in-progress' });

      const all = await db.getKanbanTickets();
      expect(all).toHaveLength(2);
    });
  });
});
