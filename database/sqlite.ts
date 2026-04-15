import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { TestSession, Action, Bug, KanbanTicket, User, CoverageEntry } from './index.js';

export class OpenQASQLiteDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/openqa.db') {
    mkdirSync(dirname(dbPath), { recursive: true, mode: 0o777 });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');   // concurrent reads while writing
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL'); // faster than FULL, safe with WAL
    this.migrate();
  }

  // ── Schema migrations ────────────────────────────────────────────────────────

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
        id               TEXT PRIMARY KEY,
        session_id       TEXT NOT NULL,
        title            TEXT NOT NULL,
        description      TEXT NOT NULL,
        severity         TEXT NOT NULL DEFAULT 'medium',
        status           TEXT NOT NULL DEFAULT 'open',
        github_issue_url TEXT,
        screenshot_path  TEXT,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS kanban_tickets (
        id             TEXT PRIMARY KEY,
        bug_id         TEXT,
        title          TEXT NOT NULL,
        description    TEXT NOT NULL DEFAULT '',
        type           TEXT,
        priority       TEXT NOT NULL DEFAULT 'medium',
        "column"       TEXT NOT NULL DEFAULT 'backlog',
        tags           TEXT,
        screenshot_url TEXT,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        passwordHash  TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'viewer',
        createdAt     TEXT NOT NULL,
        updatedAt     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coverage (
        id           TEXT PRIMARY KEY,
        session_id   TEXT NOT NULL,
        url          TEXT NOT NULL,
        path         TEXT NOT NULL,
        visits       INTEGER NOT NULL DEFAULT 0,
        actions      INTEGER NOT NULL DEFAULT 0,
        forms_tested INTEGER NOT NULL DEFAULT 0,
        api_calls    INTEGER NOT NULL DEFAULT 0,
        issues_found INTEGER NOT NULL DEFAULT 0,
        last_visited TEXT NOT NULL,
        created_at   TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_actions_session    ON actions(session_id);
      CREATE INDEX IF NOT EXISTS idx_bugs_session       ON bugs(session_id);
      CREATE INDEX IF NOT EXISTS idx_bugs_status        ON bugs(status);
      CREATE INDEX IF NOT EXISTS idx_coverage_session   ON coverage(session_id);
      CREATE INDEX IF NOT EXISTS idx_coverage_path      ON coverage(path);
      CREATE INDEX IF NOT EXISTS idx_sessions_started   ON test_sessions(started_at DESC);
    `);
  }

  // ── Config ───────────────────────────────────────────────────────────────────

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

  // ── Sessions ─────────────────────────────────────────────────────────────────

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
    if (!Object.keys(updates).length) return;
    const fields = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
    const values = [...Object.values(updates), id];
    this.db.prepare(`UPDATE test_sessions SET ${fields} WHERE id = ?`).run(...values);
  }

  async getRecentSessions(limit = 10): Promise<TestSession[]> {
    return this.db.prepare(
      'SELECT * FROM test_sessions ORDER BY started_at DESC LIMIT ?'
    ).all(limit) as TestSession[];
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async createAction(action: Omit<Action, 'id' | 'timestamp'>): Promise<Action> {
    const newAction: Action = {
      id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
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
    this.db.prepare('UPDATE test_sessions SET total_actions = total_actions + 1 WHERE id = ?')
      .run(action.session_id);
    return newAction;
  }

  async getSessionActions(sessionId: string): Promise<Action[]> {
    return this.db.prepare(
      'SELECT * FROM actions WHERE session_id = ? ORDER BY timestamp DESC'
    ).all(sessionId) as Action[];
  }

  // ── Bugs ─────────────────────────────────────────────────────────────────────

  async createBug(bug: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    const now = new Date().toISOString();
    const newBug: Bug = {
      id: `bug_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      created_at: now,
      updated_at: now,
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
    this.db.prepare('UPDATE test_sessions SET bugs_found = bugs_found + 1 WHERE id = ?')
      .run(bug.session_id);
    return newBug;
  }

  async updateBug(id: string, updates: Partial<Bug>): Promise<void> {
    const patch = { ...updates, updated_at: new Date().toISOString() };
    const fields = Object.keys(patch).map(k => `"${k}" = ?`).join(', ');
    const values = [...Object.values(patch), id];
    this.db.prepare(`UPDATE bugs SET ${fields} WHERE id = ?`).run(...values);
  }

  async getAllBugs(): Promise<Bug[]> {
    return this.db.prepare('SELECT * FROM bugs ORDER BY created_at DESC').all() as Bug[];
  }

  async getBugsByStatus(status: Bug['status']): Promise<Bug[]> {
    return this.db.prepare(
      'SELECT * FROM bugs WHERE status = ? ORDER BY created_at DESC'
    ).all(status) as Bug[];
  }

  // ── Kanban ───────────────────────────────────────────────────────────────────

  async createKanbanTicket(ticket: Omit<KanbanTicket, 'id' | 'created_at' | 'updated_at'>): Promise<KanbanTicket> {
    const now = new Date().toISOString();
    const newTicket: KanbanTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      created_at: now,
      updated_at: now,
      ...ticket,
    };
    this.db.prepare(`
      INSERT INTO kanban_tickets (id, bug_id, title, description, type, priority, "column", tags, screenshot_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newTicket.id, newTicket.bug_id ?? null, newTicket.title, newTicket.description ?? '',
      (newTicket as any).type ?? null, newTicket.priority, newTicket.column,
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
    return this.db.prepare(
      'SELECT * FROM kanban_tickets ORDER BY created_at DESC'
    ).all() as KanbanTicket[];
  }

  async getKanbanTicketsByColumn(column: KanbanTicket['column']): Promise<KanbanTicket[]> {
    return this.db.prepare(
      'SELECT * FROM kanban_tickets WHERE "column" = ? ORDER BY created_at DESC'
    ).all(column) as KanbanTicket[];
  }

  async deleteKanbanTicket(id: string): Promise<void> {
    this.db.prepare('DELETE FROM kanban_tickets WHERE id = ?').run(id);
  }

  // ── Users ────────────────────────────────────────────────────────────────────

  async countUsers(): Promise<number> {
    return (this.db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return (this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User) ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    return (this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User) ?? null;
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all() as User[];
  }

  async createUser(data: { username: string; passwordHash: string; role: User['role'] }): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    this.db.prepare(`
      INSERT INTO users (id, username, passwordHash, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, user.username, user.passwordHash, user.role, user.createdAt, user.updatedAt);
    return user;
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'passwordHash' | 'role'>>): Promise<void> {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    const fields = Object.keys(patch).map(k => `"${k}" = ?`).join(', ');
    const values = [...Object.values(patch), id];
    this.db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values);
  }

  async deleteUser(id: string): Promise<void> {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  // ── Coverage ─────────────────────────────────────────────────────────────────

  async trackPageVisit(
    sessionId: string,
    url: string,
    actionType: 'visit' | 'action' | 'form' | 'api' = 'visit',
  ): Promise<CoverageEntry> {
    let path: string;
    try {
      path = new URL(url).pathname || '/';
    } catch {
      path = url.startsWith('/') ? url : '/' + url;
    }

    const existing = this.db.prepare(
      'SELECT * FROM coverage WHERE session_id = ? AND path = ?'
    ).get(sessionId, path) as CoverageEntry | undefined;

    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE coverage SET
          visits       = visits + ?,
          actions      = actions + ?,
          forms_tested = forms_tested + ?,
          api_calls    = api_calls + ?,
          last_visited = ?
        WHERE session_id = ? AND path = ?
      `).run(
        actionType === 'visit' ? 1 : 0,
        actionType === 'action' ? 1 : 0,
        actionType === 'form' ? 1 : 0,
        actionType === 'api' ? 1 : 0,
        now, sessionId, path,
      );
      return this.db.prepare(
        'SELECT * FROM coverage WHERE session_id = ? AND path = ?'
      ).get(sessionId, path) as CoverageEntry;
    }

    const entry: CoverageEntry = {
      id: `cov_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      session_id: sessionId,
      url,
      path,
      visits:       actionType === 'visit' ? 1 : 0,
      actions:      actionType === 'action' ? 1 : 0,
      forms_tested: actionType === 'form' ? 1 : 0,
      api_calls:    actionType === 'api' ? 1 : 0,
      issues_found: 0,
      last_visited: now,
      created_at:   now,
    };
    this.db.prepare(`
      INSERT INTO coverage (id, session_id, url, path, visits, actions, forms_tested, api_calls, issues_found, last_visited, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.session_id, entry.url, entry.path,
      entry.visits, entry.actions, entry.forms_tested, entry.api_calls,
      entry.issues_found, entry.last_visited, entry.created_at,
    );
    return entry;
  }

  async incrementCoverageIssues(sessionId: string, path: string): Promise<void> {
    this.db.prepare(
      'UPDATE coverage SET issues_found = issues_found + 1 WHERE session_id = ? AND path = ?'
    ).run(sessionId, path);
  }

  async getCoverageBySession(sessionId: string): Promise<CoverageEntry[]> {
    return this.db.prepare(
      'SELECT * FROM coverage WHERE session_id = ? ORDER BY actions DESC'
    ).all(sessionId) as CoverageEntry[];
  }

  async getAllCoverage(): Promise<CoverageEntry[]> {
    return this.db.prepare('SELECT * FROM coverage ORDER BY actions DESC').all() as CoverageEntry[];
  }

  async getAggregatedCoverage(): Promise<Array<{
    path: string; visits: number; actions: number;
    forms_tested: number; api_calls: number; issues_found: number; coverage_percent: number;
  }>> {
    const rows = this.db.prepare(`
      SELECT path,
        SUM(visits) AS visits, SUM(actions) AS actions,
        SUM(forms_tested) AS forms_tested, SUM(api_calls) AS api_calls,
        SUM(issues_found) AS issues_found
      FROM coverage
      GROUP BY path
      ORDER BY actions DESC
    `).all() as Array<{ path: string; visits: number; actions: number; forms_tested: number; api_calls: number; issues_found: number }>;

    if (!rows.length) return [];
    const maxActions = Math.max(...rows.map(r => r.actions), 1);
    return rows.map(r => ({
      ...r,
      coverage_percent: Math.min(100, Math.round((r.actions / maxActions) * 100)),
    }));
  }

  async getCoverageStats(): Promise<{
    totalPages: number; totalVisits: number; totalActions: number;
    totalForms: number; totalApiCalls: number; totalIssues: number; pagesCovered: string[];
  }> {
    const count = (this.db.prepare('SELECT COUNT(*) as n FROM coverage').get() as { n: number }).n;

    if (count === 0) {
      // Fall back to session-based estimates when no explicit tracking
      const sessions = await this.getRecentSessions(1);
      if (sessions.length > 0) {
        const session = sessions[0];
        const actions = await this.getSessionActions(session.id);
        const bugs = await this.getAllBugs();
        const sessionBugs = bugs.filter(b => b.session_id === session.id);
        const specialistActions = actions.filter(a => a.type?.startsWith('specialist:'));
        return {
          totalPages: 1,
          totalVisits: specialistActions.filter(a => a.type?.endsWith(':start')).length,
          totalActions: session.total_actions || actions.length,
          totalForms: Math.floor(specialistActions.filter(a => a.type?.includes('form-tester')).length / 3),
          totalApiCalls: Math.floor(specialistActions.filter(a => a.type?.includes('api-tester')).length / 2),
          totalIssues: sessionBugs.length,
          pagesCovered: [],
        };
      }
      return { totalPages: 0, totalVisits: 0, totalActions: 0, totalForms: 0, totalApiCalls: 0, totalIssues: 0, pagesCovered: [] };
    }

    const stats = this.db.prepare(`
      SELECT
        COUNT(DISTINCT path)  AS totalPages,
        SUM(visits)           AS totalVisits,
        SUM(actions)          AS totalActions,
        SUM(forms_tested)     AS totalForms,
        SUM(api_calls)        AS totalApiCalls,
        SUM(issues_found)     AS totalIssues
      FROM coverage
    `).get() as { totalPages: number; totalVisits: number; totalActions: number; totalForms: number; totalApiCalls: number; totalIssues: number };

    const paths = (this.db.prepare('SELECT DISTINCT path FROM coverage').all() as Array<{ path: string }>).map(r => r.path);

    return { ...stats, pagesCovered: paths };
  }

  async clearCoverage(): Promise<void> {
    this.db.prepare('DELETE FROM coverage').run();
  }

  // ── Storage / Cleanup ────────────────────────────────────────────────────────

  async pruneOldSessions(maxAgeDays: number): Promise<{ sessionsRemoved: number; actionsRemoved: number }> {
    const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();
    const oldIds = (this.db.prepare(
      'SELECT id FROM test_sessions WHERE started_at < ?'
    ).all(cutoff) as Array<{ id: string }>).map(r => r.id);

    if (!oldIds.length) return { sessionsRemoved: 0, actionsRemoved: 0 };

    const ph = oldIds.map(() => '?').join(', ');
    const actionsResult = this.db.prepare(`DELETE FROM actions WHERE session_id IN (${ph})`).run(...oldIds);
    this.db.prepare(`DELETE FROM test_sessions WHERE id IN (${ph})`).run(...oldIds);

    return { sessionsRemoved: oldIds.length, actionsRemoved: actionsResult.changes };
  }

  async getStorageStats(): Promise<{ sessions: number; actions: number; bugs: number; tickets: number }> {
    const n = (t: string) => (this.db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c;
    return { sessions: n('test_sessions'), actions: n('actions'), bugs: n('bugs'), tickets: n('kanban_tickets') };
  }

  // ── Daemon compatibility helpers ─────────────────────────────────────────────

  async getActiveAgents() {
    const sessions = await this.getRecentSessions(1);
    const current = sessions[0];

    // Only count as running if started within the last 2 hours and has no ended_at
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const isRecentlyStarted = current?.started_at
      ? Date.now() - new Date(current.started_at).getTime() < TWO_HOURS
      : false;
    const isRunning = current?.status === 'running' && !current?.ended_at && isRecentlyStarted;

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
