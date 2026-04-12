import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { TestSession, Action, Bug, KanbanTicket } from './index.js';

export class OpenQASQLiteDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/openqa.db') {
    // Create data directory with proper permissions (0o777 allows write access in Docker)
    mkdirSync(dirname(dbPath), { recursive: true, mode: 0o777 });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS test_sessions (
        id            TEXT PRIMARY KEY,
        started_at    TEXT NOT NULL,
        ended_at      TEXT,
        status        TEXT NOT NULL DEFAULT 'running',
        total_actions INTEGER NOT NULL DEFAULT 0,
        bugs_found    INTEGER NOT NULL DEFAULT 0,
        metadata      TEXT
      );

      CREATE TABLE IF NOT EXISTS actions (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL,
        timestamp       TEXT NOT NULL,
        type            TEXT NOT NULL,
        description     TEXT NOT NULL,
        input           TEXT,
        output          TEXT,
        screenshot_path TEXT,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS bugs (
        id                TEXT PRIMARY KEY,
        session_id        TEXT NOT NULL,
        title             TEXT NOT NULL,
        description       TEXT NOT NULL,
        severity          TEXT NOT NULL DEFAULT 'medium',
        status            TEXT NOT NULL DEFAULT 'open',
        github_issue_url  TEXT,
        screenshot_path   TEXT,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS kanban_tickets (
        id             TEXT PRIMARY KEY,
        bug_id         TEXT,
        title          TEXT NOT NULL,
        description    TEXT NOT NULL,
        priority       TEXT NOT NULL DEFAULT 'medium',
        column         TEXT NOT NULL DEFAULT 'backlog',
        tags           TEXT,
        screenshot_url TEXT,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );
    `);
  }

  // ── Config ──

  async getConfig(key: string): Promise<string | null> {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  async setConfig(key: string, value: string): Promise<void> {
    this.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
  }

  async getAllConfig(): Promise<Record<string, string>> {
    const rows = this.db.prepare('SELECT key, value FROM config').all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async clearAllConfig(): Promise<void> {
    this.db.prepare('DELETE FROM config').run();
  }

  // ── Sessions ──

  async createSession(id: string, metadata?: Record<string, unknown>): Promise<TestSession> {
    const session: TestSession = {
      id,
      started_at: new Date().toISOString(),
      status: 'running',
      total_actions: 0,
      bugs_found: 0,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    };
    this.db.prepare(`
      INSERT INTO test_sessions (id, started_at, status, total_actions, bugs_found, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(session.id, session.started_at, session.status, session.total_actions, session.bugs_found, session.metadata ?? null);
    return session;
  }

  async getSession(id: string): Promise<TestSession | null> {
    return (this.db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(id) as TestSession) ?? null;
  }

  async updateSession(id: string, updates: Partial<TestSession>): Promise<void> {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    this.db.prepare(`UPDATE test_sessions SET ${fields} WHERE id = ?`).run(...values);
  }

  async getRecentSessions(limit = 10): Promise<TestSession[]> {
    return this.db.prepare('SELECT * FROM test_sessions ORDER BY started_at DESC LIMIT ?').all(limit) as TestSession[];
  }

  // ── Actions ──

  async createAction(action: Omit<Action, 'id' | 'timestamp'>): Promise<Action> {
    const newAction: Action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      ...action,
    };
    this.db.prepare(`
      INSERT INTO actions (id, session_id, timestamp, type, description, input, output, screenshot_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newAction.id, newAction.session_id, newAction.timestamp,
      newAction.type, newAction.description,
      newAction.input ?? null, newAction.output ?? null, newAction.screenshot_path ?? null,
    );
    return newAction;
  }

  async getSessionActions(sessionId: string): Promise<Action[]> {
    return this.db.prepare('SELECT * FROM actions WHERE session_id = ? ORDER BY timestamp DESC').all(sessionId) as Action[];
  }

  // ── Bugs ──

  async createBug(bug: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    const newBug: Bug = {
      id: `bug_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...bug,
    };
    this.db.prepare(`
      INSERT INTO bugs (id, session_id, title, description, severity, status, github_issue_url, screenshot_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newBug.id, newBug.session_id, newBug.title, newBug.description,
      newBug.severity, newBug.status,
      newBug.github_issue_url ?? null, newBug.screenshot_path ?? null,
      newBug.created_at, newBug.updated_at,
    );
    return newBug;
  }

  async updateBug(id: string, updates: Partial<Bug>): Promise<void> {
    const patch = { ...updates, updated_at: new Date().toISOString() };
    const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(patch), id];
    this.db.prepare(`UPDATE bugs SET ${fields} WHERE id = ?`).run(...values);
  }

  async getAllBugs(): Promise<Bug[]> {
    return this.db.prepare('SELECT * FROM bugs ORDER BY created_at DESC').all() as Bug[];
  }

  async getBugsByStatus(status: Bug['status']): Promise<Bug[]> {
    return this.db.prepare('SELECT * FROM bugs WHERE status = ? ORDER BY created_at DESC').all(status) as Bug[];
  }

  // ── Kanban ──

  async createKanbanTicket(ticket: Omit<KanbanTicket, 'id' | 'created_at' | 'updated_at'>): Promise<KanbanTicket> {
    const newTicket: KanbanTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...ticket,
    };
    this.db.prepare(`
      INSERT INTO kanban_tickets (id, bug_id, title, description, priority, column, tags, screenshot_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newTicket.id, newTicket.bug_id ?? null, newTicket.title, newTicket.description,
      newTicket.priority, newTicket.column,
      newTicket.tags ?? null, newTicket.screenshot_url ?? null,
      newTicket.created_at, newTicket.updated_at,
    );
    return newTicket;
  }

  async updateKanbanTicket(id: string, updates: Partial<KanbanTicket>): Promise<void> {
    const patch = { ...updates, updated_at: new Date().toISOString() };
    const fields = Object.keys(patch).map(k => `"${k}" = ?`).join(', ');
    const values = [...Object.values(patch), id];
    this.db.prepare(`UPDATE kanban_tickets SET ${fields} WHERE id = ?`).run(...values);
  }

  async getKanbanTickets(): Promise<KanbanTicket[]> {
    return this.db.prepare('SELECT * FROM kanban_tickets ORDER BY created_at DESC').all() as KanbanTicket[];
  }

  async getKanbanTicketsByColumn(column: KanbanTicket['column']): Promise<KanbanTicket[]> {
    return this.db.prepare('SELECT * FROM kanban_tickets WHERE "column" = ? ORDER BY created_at DESC').all(column) as KanbanTicket[];
  }

  async deleteKanbanTicket(id: string): Promise<void> {
    this.db.prepare('DELETE FROM kanban_tickets WHERE id = ?').run(id);
  }

  // ── Storage / Cleanup ──

  async pruneOldSessions(maxAgeDays: number): Promise<{ sessionsRemoved: number; actionsRemoved: number }> {
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();
    const oldSessions = this.db.prepare('SELECT id FROM test_sessions WHERE started_at < ?').all(cutoff) as Array<{ id: string }>;
    const ids = oldSessions.map(s => s.id);
    if (ids.length === 0) return { sessionsRemoved: 0, actionsRemoved: 0 };

    const placeholders = ids.map(() => '?').join(', ');
    const actionsResult = this.db.prepare(`DELETE FROM actions WHERE session_id IN (${placeholders})`).run(...ids);
    this.db.prepare(`DELETE FROM test_sessions WHERE id IN (${placeholders})`).run(...ids);

    return { sessionsRemoved: ids.length, actionsRemoved: actionsResult.changes };
  }

  async getStorageStats(): Promise<{ sessions: number; actions: number; bugs: number; tickets: number }> {
    const count = (table: string): number =>
      (this.db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get() as { n: number }).n;
    return {
      sessions: count('test_sessions'),
      actions: count('actions'),
      bugs: count('bugs'),
      tickets: count('kanban_tickets'),
    };
  }

  // ── Compat helpers (used by daemon.ts) ──

  async getActiveAgents() {
    const sessions = await this.getRecentSessions(1);
    const current = sessions[0];
    const isRunning = current?.status === 'running';
    return [{
      name: 'Main Agent',
      status: isRunning ? 'running' : 'idle',
      purpose: 'Autonomous QA orchestration',
      performance: current ? Math.min(100, Math.round((current.total_actions / 100) * 100)) : 0,
      tasks: current?.total_actions ?? 0,
    }];
  }

  async getCurrentTasks() {
    const sessions = await this.getRecentSessions(1);
    if (!sessions[0]) return [];
    const actions = await this.getSessionActions(sessions[0].id);
    return actions.slice(0, 10).map((a, i) => ({
      id: a.id, name: a.type, status: i === 0 && sessions[0].status === 'running' ? 'running' : 'completed',
      progress: i === 0 && sessions[0].status === 'running' ? '65%' : '100%',
      agent: 'Main Agent', started_at: a.timestamp, result: a.output || a.description,
    }));
  }

  async getCurrentIssues() {
    const bugs = await this.getAllBugs();
    return bugs.slice(0, 10).map(b => ({
      id: b.id, title: b.title, description: b.description,
      severity: b.severity, status: b.status, discovered_at: b.created_at, agent: 'Main Agent',
    }));
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
