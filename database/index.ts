import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestSession {
  id: string;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'completed' | 'failed';
  total_actions: number;
  bugs_found: number;
  metadata?: string;
}

export interface Action {
  id: string;
  session_id: string;
  timestamp: string;
  type: string;
  description: string;
  input?: string;
  output?: string;
  screenshot_path?: string;
}

export interface Bug {
  id: string;
  session_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  github_issue_url?: string;
  screenshot_path?: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanTicket {
  id: string;
  bug_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  column: 'backlog' | 'to-do' | 'in-progress' | 'done';
  tags?: string;
  screenshot_url?: string;
  created_at: string;
  updated_at: string;
}

export class OpenQADatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/openqa.db') {
    const dir = dirname(dbPath);
    mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schema);
  }

  getConfig(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  setConfig(key: string, value: string) {
    this.db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
  }

  getAllConfig(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  createSession(id: string, metadata?: any): TestSession {
    this.db.prepare('INSERT INTO test_sessions (id, status, metadata) VALUES (?, ?, ?)').run(
      id,
      'running',
      metadata ? JSON.stringify(metadata) : null
    );
    return this.getSession(id)!;
  }

  getSession(id: string): TestSession | null {
    return this.db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(id) as TestSession | null;
  }

  updateSession(id: string, updates: Partial<TestSession>) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    this.db.prepare(`UPDATE test_sessions SET ${fields} WHERE id = ?`).run(...values);
  }

  getRecentSessions(limit: number = 10): TestSession[] {
    return this.db.prepare('SELECT * FROM test_sessions ORDER BY started_at DESC LIMIT ?').all(limit) as TestSession[];
  }

  createAction(action: Omit<Action, 'id' | 'timestamp'>): Action {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare('INSERT INTO actions (id, session_id, type, description, input, output, screenshot_path) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id,
      action.session_id,
      action.type,
      action.description,
      action.input || null,
      action.output || null,
      action.screenshot_path || null
    );
    return this.db.prepare('SELECT * FROM actions WHERE id = ?').get(id) as Action;
  }

  getSessionActions(sessionId: string): Action[] {
    return this.db.prepare('SELECT * FROM actions WHERE session_id = ? ORDER BY timestamp DESC').all(sessionId) as Action[];
  }

  createBug(bug: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Bug {
    const id = `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare('INSERT INTO bugs (id, session_id, title, description, severity, status, github_issue_url, screenshot_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      bug.session_id,
      bug.title,
      bug.description,
      bug.severity,
      bug.status,
      bug.github_issue_url || null,
      bug.screenshot_path || null
    );
    return this.db.prepare('SELECT * FROM bugs WHERE id = ?').get(id) as Bug;
  }

  updateBug(id: string, updates: Partial<Bug>) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    this.db.prepare(`UPDATE bugs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  }

  getAllBugs(): Bug[] {
    return this.db.prepare('SELECT * FROM bugs ORDER BY created_at DESC').all() as Bug[];
  }

  getBugsByStatus(status: Bug['status']): Bug[] {
    return this.db.prepare('SELECT * FROM bugs WHERE status = ? ORDER BY created_at DESC').all(status) as Bug[];
  }

  createKanbanTicket(ticket: Omit<KanbanTicket, 'id' | 'created_at' | 'updated_at'>): KanbanTicket {
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare('INSERT INTO kanban_tickets (id, bug_id, title, description, priority, column, tags, screenshot_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      ticket.bug_id || null,
      ticket.title,
      ticket.description,
      ticket.priority,
      ticket.column,
      ticket.tags || null,
      ticket.screenshot_url || null
    );
    return this.db.prepare('SELECT * FROM kanban_tickets WHERE id = ?').get(id) as KanbanTicket;
  }

  updateKanbanTicket(id: string, updates: Partial<KanbanTicket>) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    this.db.prepare(`UPDATE kanban_tickets SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  }

  getKanbanTickets(): KanbanTicket[] {
    return this.db.prepare('SELECT * FROM kanban_tickets ORDER BY created_at DESC').all() as KanbanTicket[];
  }

  getKanbanTicketsByColumn(column: KanbanTicket['column']): KanbanTicket[] {
    return this.db.prepare('SELECT * FROM kanban_tickets WHERE column = ? ORDER BY created_at DESC').all(column) as KanbanTicket[];
  }

  close() {
    this.db.close();
  }
}
