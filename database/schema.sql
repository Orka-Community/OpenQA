-- OpenQA Database Schema

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
  total_actions INTEGER DEFAULT 0,
  bugs_found INTEGER DEFAULT 0,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL,
  description TEXT,
  input TEXT,
  output TEXT,
  screenshot_path TEXT,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);

CREATE TABLE IF NOT EXISTS bugs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT CHECK(status IN ('open', 'in-progress', 'resolved', 'closed')),
  github_issue_url TEXT,
  screenshot_path TEXT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bug_id) REFERENCES bugs(id)
);

CREATE INDEX IF NOT EXISTS idx_actions_session ON actions(session_id);
CREATE INDEX IF NOT EXISTS idx_bugs_session ON bugs(session_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_kanban_column ON kanban_tickets(column);
