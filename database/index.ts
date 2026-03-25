import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

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

interface DatabaseSchema {
  config: Record<string, string>;
  test_sessions: TestSession[];
  actions: Action[];
  bugs: Bug[];
  kanban_tickets: KanbanTicket[];
}

export class OpenQADatabase {
  private db: Low<DatabaseSchema> | null = null;

  constructor(private dbPath: string = './data/openqa.json') {
    this.initialize();
  }

  private initialize() {
    const dir = dirname(this.dbPath);
    mkdirSync(dir, { recursive: true });

    const adapter = new JSONFile<DatabaseSchema>(this.dbPath);
    this.db = new Low<DatabaseSchema>(adapter, {
      config: {},
      test_sessions: [],
      actions: [],
      bugs: [],
      kanban_tickets: []
    });

    this.db.read();
    if (!this.db.data) {
      this.db.data = {
        config: {},
        test_sessions: [],
        actions: [],
        bugs: [],
        kanban_tickets: []
      };
      this.db.write();
    }
  }

  private async ensureInitialized() {
    if (!this.db) {
      this.initialize();
    }
    await this.db!.read();
  }

  async getConfig(key: string): Promise<string | null> {
    await this.ensureInitialized();
    return this.db!.data.config[key] || null;
  }

  async setConfig(key: string, value: string) {
    await this.ensureInitialized();
    this.db!.data.config[key] = value;
    await this.db!.write();
  }

  async getAllConfig(): Promise<Record<string, string>> {
    await this.ensureInitialized();
    return this.db!.data.config;
  }

  async createSession(id: string, metadata?: any): Promise<TestSession> {
    await this.ensureInitialized();
    const session: TestSession = {
      id,
      started_at: new Date().toISOString(),
      status: 'running',
      total_actions: 0,
      bugs_found: 0,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    };
    this.db!.data.test_sessions.push(session);
    await this.db!.write();
    return session;
  }

  async getSession(id: string): Promise<TestSession | null> {
    await this.ensureInitialized();
    return this.db!.data.test_sessions.find(s => s.id === id) || null;
  }

  async updateSession(id: string, updates: Partial<TestSession>) {
    await this.ensureInitialized();
    const index = this.db!.data.test_sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      this.db!.data.test_sessions[index] = { ...this.db!.data.test_sessions[index], ...updates };
      await this.db!.write();
    }
  }

  async getRecentSessions(limit: number = 10): Promise<TestSession[]> {
    await this.ensureInitialized();
    return this.db!.data.test_sessions
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit);
  }

  async createAction(action: Omit<Action, 'id' | 'timestamp'>): Promise<Action> {
    await this.ensureInitialized();
    const newAction: Action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...action
    };
    this.db!.data.actions.push(newAction);
    await this.db!.write();
    return newAction;
  }

  async getSessionActions(sessionId: string): Promise<Action[]> {
    await this.ensureInitialized();
    return this.db!.data.actions
      .filter(a => a.session_id === sessionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createBug(bug: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    await this.ensureInitialized();
    const newBug: Bug = {
      id: `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...bug
    };
    this.db!.data.bugs.push(newBug);
    await this.db!.write();
    return newBug;
  }

  async updateBug(id: string, updates: Partial<Bug>) {
    await this.ensureInitialized();
    const index = this.db!.data.bugs.findIndex(b => b.id === id);
    if (index !== -1) {
      this.db!.data.bugs[index] = { 
        ...this.db!.data.bugs[index], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      await this.db!.write();
    }
  }

  async getAllBugs(): Promise<Bug[]> {
    await this.ensureInitialized();
    return this.db!.data.bugs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getBugsByStatus(status: Bug['status']): Promise<Bug[]> {
    await this.ensureInitialized();
    return this.db!.data.bugs
      .filter(b => b.status === status)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createKanbanTicket(ticket: Omit<KanbanTicket, 'id' | 'created_at' | 'updated_at'>): Promise<KanbanTicket> {
    await this.ensureInitialized();
    const newTicket: KanbanTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...ticket
    };
    this.db!.data.kanban_tickets.push(newTicket);
    await this.db!.write();
    return newTicket;
  }

  async updateKanbanTicket(id: string, updates: Partial<KanbanTicket>) {
    await this.ensureInitialized();
    const index = this.db!.data.kanban_tickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.db!.data.kanban_tickets[index] = { 
        ...this.db!.data.kanban_tickets[index], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      await this.db!.write();
    }
  }

  async getKanbanTickets(): Promise<KanbanTicket[]> {
    await this.ensureInitialized();
    return this.db!.data.kanban_tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getKanbanTicketsByColumn(column: KanbanTicket['column']): Promise<KanbanTicket[]> {
    await this.ensureInitialized();
    return this.db!.data.kanban_tickets
      .filter(t => t.column === column)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async close() {
    // LowDB doesn't need explicit closing
  }
}
