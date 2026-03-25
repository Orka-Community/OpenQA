-- OpenQA Database Schema v2 - Extended for multi-agents and skills

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_sessions (
  id TEXT PRIMARY KEY,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  status TEXT CHECK(status IN ('running', 'completed', 'failed')),
  trigger_type TEXT CHECK(trigger_type IN ('manual', 'scheduled', 'merge', 'pipeline', 'webhook')),
  trigger_data TEXT,
  total_actions INTEGER DEFAULT 0,
  bugs_found INTEGER DEFAULT 0,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL,
  description TEXT,
  input TEXT,
  output TEXT,
  screenshot_path TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);

CREATE TABLE IF NOT EXISTS bugs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT CHECK(category IN ('ui', 'security', 'performance', 'accessibility', 'functional', 'other')),
  status TEXT CHECK(status IN ('open', 'in-progress', 'resolved', 'closed', 'false-positive')),
  github_issue_url TEXT,
  gitlab_issue_url TEXT,
  screenshot_path TEXT,
  reproduction_steps TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);

CREATE TABLE IF NOT EXISTS kanban_tickets (
  id TEXT PRIMARY KEY,
  bug_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  column TEXT CHECK(column IN ('backlog', 'to-do', 'in-progress', 'done')),
  tags TEXT,
  screenshot_url TEXT,
  assigned_to TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bug_id) REFERENCES bugs(id)
);

-- New tables for v2

CREATE TABLE IF NOT EXISTS specialist_agents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('idle', 'running', 'completed', 'failed', 'stopped')),
  current_task TEXT,
  progress INTEGER DEFAULT 0,
  findings INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK(type IN ('directive', 'test-scenario', 'custom-check', 'workflow')),
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  prompt TEXT NOT NULL,
  triggers TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  status TEXT CHECK(status IN ('running', 'completed', 'failed', 'skipped')),
  result TEXT,
  findings_count INTEGER DEFAULT 0,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);

CREATE TABLE IF NOT EXISTS git_events (
  id TEXT PRIMARY KEY,
  provider TEXT CHECK(provider IN ('github', 'gitlab')),
  event_type TEXT CHECK(event_type IN ('merge', 'push', 'pipeline_success', 'pipeline_failure', 'tag')),
  branch TEXT,
  commit_sha TEXT,
  author TEXT,
  message TEXT,
  pipeline_id TEXT,
  pipeline_status TEXT,
  triggered_session_id TEXT,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (triggered_session_id) REFERENCES test_sessions(id)
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  level TEXT CHECK(level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actions_session ON actions(session_id);
CREATE INDEX IF NOT EXISTS idx_actions_agent ON actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_bugs_session ON bugs(session_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bugs(severity);
CREATE INDEX IF NOT EXISTS idx_bugs_category ON bugs(category);
CREATE INDEX IF NOT EXISTS idx_kanban_column ON kanban_tickets(column);
CREATE INDEX IF NOT EXISTS idx_specialist_session ON specialist_agents(session_id);
CREATE INDEX IF NOT EXISTS idx_specialist_status ON specialist_agents(status);
CREATE INDEX IF NOT EXISTS idx_skill_exec_session ON skill_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_git_events_branch ON git_events(branch);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session ON agent_logs(session_id);
