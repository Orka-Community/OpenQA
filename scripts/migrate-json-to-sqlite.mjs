#!/usr/bin/env node
/**
 * migrate-json-to-sqlite.mjs
 * Migrates an existing openqa.json (LowDB) to openqa.db (SQLite).
 *
 * Usage:
 *   node scripts/migrate-json-to-sqlite.mjs [src.json] [dest.db]
 *
 * Defaults:
 *   src  → ./data/openqa.json
 *   dest → ./data/openqa.db
 */

import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const srcPath  = resolve(process.argv[2] || './data/openqa.json');
const destPath = resolve(process.argv[3] || './data/openqa.db');

if (!existsSync(srcPath)) {
  console.error(`❌  Source not found: ${srcPath}`);
  process.exit(1);
}

if (existsSync(destPath)) {
  console.warn(`⚠️  Destination already exists: ${destPath}`);
  console.warn('    Delete it first if you want a fresh migration.');
  process.exit(1);
}

console.log(`📂  Source : ${srcPath}`);
console.log(`🗄️   Dest   : ${destPath}`);
console.log('');

// Load JSON
const raw = JSON.parse(readFileSync(srcPath, 'utf-8'));

// Open SQLite
const Database = require('better-sqlite3');
const { mkdirSync } = require('fs');
const { dirname: dn } = require('path');

mkdirSync(dn(destPath), { recursive: true });
const db = new Database(destPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS test_sessions (
    id TEXT PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    total_actions INTEGER NOT NULL DEFAULT 0,
    bugs_found INTEGER NOT NULL DEFAULT 0,
    metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, timestamp TEXT NOT NULL,
    type TEXT NOT NULL, description TEXT NOT NULL,
    input TEXT, output TEXT, screenshot_path TEXT,
    FOREIGN KEY (session_id) REFERENCES test_sessions(id)
  );
  CREATE TABLE IF NOT EXISTS bugs (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open',
    github_issue_url TEXT, screenshot_path TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES test_sessions(id)
  );
  CREATE TABLE IF NOT EXISTS kanban_tickets (
    id TEXT PRIMARY KEY, bug_id TEXT,
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    type TEXT, priority TEXT NOT NULL DEFAULT 'medium',
    "column" TEXT NOT NULL DEFAULT 'backlog',
    tags TEXT, screenshot_url TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer',
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS coverage (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
    url TEXT NOT NULL, path TEXT NOT NULL,
    visits INTEGER NOT NULL DEFAULT 0, actions INTEGER NOT NULL DEFAULT 0,
    forms_tested INTEGER NOT NULL DEFAULT 0, api_calls INTEGER NOT NULL DEFAULT 0,
    issues_found INTEGER NOT NULL DEFAULT 0,
    last_visited TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_actions_session  ON actions(session_id);
  CREATE INDEX IF NOT EXISTS idx_bugs_session     ON bugs(session_id);
  CREATE INDEX IF NOT EXISTS idx_coverage_session ON coverage(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON test_sessions(started_at DESC);
`);

// ── Migrate each table ───────────────────────────────────────────────────────

function insert(table, row) {
  const keys = Object.keys(row);
  const cols = keys.map(k => `"${k}"`).join(', ');
  const phs  = keys.map(() => '?').join(', ');
  db.prepare(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${phs})`).run(...Object.values(row));
}

let counts = {};

function migrate(table, rows, transform = r => r) {
  if (!Array.isArray(rows) || !rows.length) { counts[table] = 0; return; }
  const tx = db.transaction(() => rows.forEach(r => insert(table, transform(r))));
  tx();
  counts[table] = rows.length;
}

// Config
if (raw.config && typeof raw.config === 'object') {
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(raw.config)) {
      db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)').run(key, String(value));
    }
  });
  tx();
  counts['config'] = Object.keys(raw.config).length;
}

migrate('test_sessions', raw.test_sessions);
migrate('actions', raw.actions);
migrate('bugs', raw.bugs);
migrate('kanban_tickets', raw.kanban_tickets, r => ({
  ...r,
  description: r.description ?? '',
}));
migrate('users', raw.users);
migrate('coverage', raw.coverage);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('✅  Migration complete:');
for (const [table, count] of Object.entries(counts)) {
  console.log(`    ${table.padEnd(20)} ${count} rows`);
}
console.log('');
console.log('👉  Update your DB_PATH env var:');
console.log(`    DB_PATH=${destPath}`);
