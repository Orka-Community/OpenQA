import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

export { OpenQASQLiteDatabase } from './sqlite.js';

/**
 * Factory — chooses SQLite for .db paths, LowDB for .json paths.
 */
export async function createDatabase(path: string): Promise<OpenQADatabase> {
  if (path.endsWith('.db')) {
    const { OpenQASQLiteDatabase } = await import('./sqlite.js');
    return new OpenQASQLiteDatabase(path) as unknown as OpenQADatabase;
  }
  return new OpenQADatabase(path);
}

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

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  config: Record<string, string>;
  test_sessions: TestSession[];
  actions: Action[];
  bugs: Bug[];
  kanban_tickets: KanbanTicket[];
  users: User[];
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
      kanban_tickets: [],
      users: [],
    });

    this.db.read();
    if (!this.db.data) {
      this.db.data = {
        config: {},
        test_sessions: [],
        actions: [],
        bugs: [],
        kanban_tickets: [],
        users: [],
      };
      this.db.write();
    }
  }

  private async ensureInitialized() {
    if (!this.db) {
      this.initialize();
    }
    await this.db!.read();
    // Auto-migrate: add any missing top-level arrays added in later versions
    let migrated = false;
    if (!this.db!.data.users) { this.db!.data.users = []; migrated = true; }
    if (migrated) await this.db!.write();
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

  async createSession(id: string, metadata?: Record<string, unknown>): Promise<TestSession> {
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

  async deleteKanbanTicket(id: string): Promise<void> {
    await this.ensureInitialized();
    const index = this.db!.data.kanban_tickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.db!.data.kanban_tickets.splice(index, 1);
      await this.db!.write();
    }
  }

  async clearAllConfig() {
    await this.ensureInitialized();
    this.db!.data.config = {};
    await this.db!.write();
  }

  // Get real data methods - connected to actual database records

  async getActiveAgents() {
    await this.ensureInitialized();
    const sessions = await this.getRecentSessions(1);
    const currentSession = sessions[0];
    
    // Return real agent state based on session status
    const isRunning = currentSession?.status === 'running';
    const totalActions = currentSession?.total_actions || 0;
    
    // Main agent is always present
    const agents = [
      { 
        name: 'Main Agent', 
        status: isRunning ? 'running' : 'idle', 
        purpose: 'Autonomous QA orchestration', 
        performance: totalActions > 0 ? Math.min(100, Math.round((totalActions / 100) * 100)) : 0, 
        tasks: totalActions 
      }
    ];
    
    // Add dynamic agents based on actual session activity
    if (currentSession && totalActions > 0) {
      const actions = await this.getSessionActions(currentSession.id);
      
      // Group actions by type to determine which specialists are active
      const actionTypes = actions.reduce((acc: Record<string, number>, action) => {
        const type = action.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      // Add specialists based on actual action types
      if (actionTypes['navigate'] || actionTypes['click'] || actionTypes['screenshot']) {
        agents.push({
          name: 'Browser Specialist',
          status: isRunning ? 'running' : 'idle',
          purpose: 'UI navigation and interaction',
          performance: Math.round(((actionTypes['navigate'] || 0) + (actionTypes['click'] || 0)) / totalActions * 100),
          tasks: (actionTypes['navigate'] || 0) + (actionTypes['click'] || 0)
        });
      }
      
      if (actionTypes['api_call'] || actionTypes['request']) {
        agents.push({
          name: 'API Tester',
          status: isRunning ? 'running' : 'idle',
          purpose: 'API endpoint testing',
          performance: Math.round((actionTypes['api_call'] || actionTypes['request'] || 0) / totalActions * 100),
          tasks: actionTypes['api_call'] || actionTypes['request'] || 0
        });
      }
      
      if (actionTypes['auth'] || actionTypes['login']) {
        agents.push({
          name: 'Auth Specialist',
          status: isRunning ? 'running' : 'idle',
          purpose: 'Authentication testing',
          performance: Math.round((actionTypes['auth'] || actionTypes['login'] || 0) / totalActions * 100),
          tasks: actionTypes['auth'] || actionTypes['login'] || 0
        });
      }
    }
    
    return agents;
  }

  async getCurrentTasks() {
    await this.ensureInitialized();
    const sessions = await this.getRecentSessions(1);
    const currentSession = sessions[0];
    
    if (!currentSession) {
      return [];
    }

    // Get real actions from the session
    const actions = await this.getSessionActions(currentSession.id);
    
    // Convert recent actions to tasks
    const recentActions = actions.slice(-10).reverse();
    
    return recentActions.map((action, index) => ({
      id: action.id,
      name: action.type || 'Unknown Action',
      status: index === 0 && currentSession.status === 'running' ? 'running' : 'completed',
      progress: index === 0 && currentSession.status === 'running' ? '65%' : '100%',
      agent: 'Main Agent',
      started_at: action.timestamp,
      result: action.output || action.description || 'Completed'
    }));
  }

  async getCurrentIssues() {
    await this.ensureInitialized();
    
    // Get real bugs from the database
    const bugs = await this.getAllBugs();
    
    // Return actual bugs as issues
    return bugs.slice(0, 10).map(bug => ({
      id: bug.id,
      title: bug.title,
      description: bug.description,
      severity: bug.severity || 'medium',
      status: bug.status || 'open',
      discovered_at: bug.created_at,
      agent: 'Main Agent'
    }));
  }

  async pruneOldSessions(maxAgeDays: number): Promise<{ sessionsRemoved: number; actionsRemoved: number }> {
    await this.ensureInitialized();
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();

    const oldSessions = this.db!.data.test_sessions.filter(s => s.started_at < cutoff);
    const oldSessionIds = new Set(oldSessions.map(s => s.id));

    const actionsBefore = this.db!.data.actions.length;
    this.db!.data.actions = this.db!.data.actions.filter(a => !oldSessionIds.has(a.session_id));
    const actionsRemoved = actionsBefore - this.db!.data.actions.length;

    this.db!.data.test_sessions = this.db!.data.test_sessions.filter(s => s.started_at >= cutoff);
    await this.db!.write();

    return { sessionsRemoved: oldSessions.length, actionsRemoved };
  }

  async getStorageStats(): Promise<{ sessions: number; actions: number; bugs: number; tickets: number }> {
    await this.ensureInitialized();
    return {
      sessions: this.db!.data.test_sessions.length,
      actions: this.db!.data.actions.length,
      bugs: this.db!.data.bugs.length,
      tickets: this.db!.data.kanban_tickets.length,
    };
  }

  // ── User management ──────────────────────────────────────────────────────────

  async countUsers(): Promise<number> {
    await this.ensureInitialized();
    return this.db!.data.users.length;
  }

  async findUserByUsername(username: string): Promise<User | null> {
    await this.ensureInitialized();
    return this.db!.data.users.find(u => u.username === username) ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    await this.ensureInitialized();
    return this.db!.data.users.find(u => u.id === id) ?? null;
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return [...this.db!.data.users];
  }

  async createUser(data: { username: string; passwordHash: string; role: User['role'] }): Promise<User> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    this.db!.data.users.push(user);
    await this.db!.write();
    return user;
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'passwordHash' | 'role'>>): Promise<void> {
    await this.ensureInitialized();
    const idx = this.db!.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.db!.data.users[idx] = {
        ...this.db!.data.users[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await this.db!.write();
    }
  }

  async deleteUser(id: string): Promise<void> {
    await this.ensureInitialized();
    const idx = this.db!.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.db!.data.users.splice(idx, 1);
      await this.db!.write();
    }
  }

  async close() {
    // LowDB doesn't need explicit closing
  }
}
