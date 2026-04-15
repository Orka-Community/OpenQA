import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExportService } from '../../agent/export/index.js';
import { OpenQADatabase } from '../../database/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function tempDbPath() {
  return join(tmpdir(), `openqa-export-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanFile(p: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = p + suffix;
    if (existsSync(f)) try { unlinkSync(f); } catch { /* ignore */ }
  }
}

describe('ExportService', () => {
  let db: OpenQADatabase;
  let dbPath: string;
  let service: ExportService;

  beforeEach(async () => {
    dbPath = tempDbPath();
    db = new OpenQADatabase(dbPath);
    service = new ExportService(db);

    // Seed: session + actions + bugs.
    // createAction auto-increments total_actions; createBug auto-increments bugs_found.
    // Call updateSession LAST so the SET overwrites the incremented values correctly.
    await db.createSession('sess_export_1');

    await db.createAction({
      session_id: 'sess_export_1',
      type: 'navigate',
      description: 'Navigated to https://www.wiloomail.com',
      input: 'https://www.wiloomail.com',
      output: 'Page loaded',
    });
    await db.createAction({
      session_id: 'sess_export_1',
      type: 'click',
      description: 'Clicked login button',
      input: '#login-btn',
      output: 'Login form opened',
    });

    await db.createBug({
      session_id: 'sess_export_1',
      title: 'Login button unresponsive on mobile',
      description: 'The login button does not respond to taps on iOS Safari',
      severity: 'high',
      status: 'open',
    });

    // Update session AFTER all inserts — SET overrides auto-incremented values
    await db.updateSession('sess_export_1', { status: 'completed', total_actions: 2, bugs_found: 1 });
  });

  afterEach(() => {
    cleanFile(dbPath);
  });

  // ── JSON export ─────────────────────────────────────────────────────────────

  describe('JSON format', () => {
    it('returns valid JSON with session, actions, and bugs', async () => {
      const result = await service.exportSession('sess_export_1', 'json');

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toContain('sess_export_1');
      expect(result.filename).toMatch(/\.json$/);

      const data = JSON.parse(result.content);
      expect(data.session.id).toBe('sess_export_1');
      expect(data.actions).toHaveLength(2);
      expect(data.bugs).toHaveLength(1);
      expect(data.bugs[0].severity).toBe('high');
    });

    it('includes session status and counts in JSON', async () => {
      const result = await service.exportSession('sess_export_1', 'json');
      const data = JSON.parse(result.content);
      expect(data.session.status).toBe('completed');
      expect(data.session.total_actions).toBe(2);
      expect(data.session.bugs_found).toBe(1);
    });
  });

  // ── CSV export ──────────────────────────────────────────────────────────────

  describe('CSV format', () => {
    it('returns text/csv content type with correct filename', async () => {
      const result = await service.exportSession('sess_export_1', 'csv');
      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toContain('sess_export_1');
      expect(result.filename).toMatch(/\.csv$/);
    });

    it('CSV contains session summary section', async () => {
      const result = await service.exportSession('sess_export_1', 'csv');
      expect(result.content).toContain('# Session Summary');
      expect(result.content).toContain('sess_export_1');
    });

    it('CSV contains actions section', async () => {
      const result = await service.exportSession('sess_export_1', 'csv');
      expect(result.content).toContain('# Actions');
      expect(result.content).toContain('navigate');
      expect(result.content).toContain('click');
    });

    it('CSV contains bugs section', async () => {
      const result = await service.exportSession('sess_export_1', 'csv');
      expect(result.content).toContain('# Bugs');
      expect(result.content).toContain('high');
    });

    it('CSV escapes values with commas', async () => {
      await db.createAction({
        session_id: 'sess_export_1',
        type: 'fill',
        description: 'Filled field: first, last',
        input: 'first, last',
        output: 'ok',
      });
      const result = await service.exportSession('sess_export_1', 'csv');
      expect(result.content).toContain('"Filled field: first, last"');
    });
  });

  // ── HTML export ─────────────────────────────────────────────────────────────

  describe('HTML format', () => {
    it('returns text/html content type with correct filename', async () => {
      const result = await service.exportSession('sess_export_1', 'html');
      expect(result.contentType).toBe('text/html');
      expect(result.filename).toContain('sess_export_1');
      expect(result.filename).toMatch(/\.html$/);
    });

    it('HTML contains session id in title', async () => {
      const result = await service.exportSession('sess_export_1', 'html');
      expect(result.content).toContain('sess_export_1');
    });

    it('HTML contains bug title and severity badge', async () => {
      const result = await service.exportSession('sess_export_1', 'html');
      expect(result.content).toContain('Login button unresponsive on mobile');
      expect(result.content).toContain('high');
    });

    it('HTML contains action types', async () => {
      const result = await service.exportSession('sess_export_1', 'html');
      expect(result.content).toContain('navigate');
      expect(result.content).toContain('click');
    });

    it('HTML escapes angle brackets to prevent XSS', async () => {
      await db.createBug({
        session_id: 'sess_export_1',
        title: '<script>alert(1)</script>',
        description: 'XSS attempt in title',
        severity: 'critical',
        status: 'open',
      });
      const result = await service.exportSession('sess_export_1', 'html');
      expect(result.content).not.toContain('<script>alert(1)</script>');
      expect(result.content).toContain('&lt;script&gt;');
    });

    it('HTML is a complete document with <html> and <body> tags', async () => {
      const result = await service.exportSession('sess_export_1', 'html');
      expect(result.content).toMatch(/<!DOCTYPE html>/i);
      expect(result.content).toContain('<html');
      expect(result.content).toContain('</html>');
      expect(result.content).toContain('<body>');
      expect(result.content).toContain('</body>');
    });

    it('HTML shows stats section with action count', async () => {
      const result = await service.exportSession('sess_export_1', 'html');
      // stat-value for total_actions = 2
      expect(result.content).toContain('2');
    });
  });

  // ── error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws when session does not exist', async () => {
      await expect(service.exportSession('nonexistent_session', 'json'))
        .rejects.toThrow('not found');
    });
  });

  // ── empty session ────────────────────────────────────────────────────────────

  describe('empty session (no actions, no bugs)', () => {
    beforeEach(async () => {
      await db.createSession('sess_empty');
    });

    it('exports JSON with empty arrays', async () => {
      const result = await service.exportSession('sess_empty', 'json');
      const data = JSON.parse(result.content);
      expect(data.actions).toHaveLength(0);
      expect(data.bugs).toHaveLength(0);
    });

    it('exports CSV without crashing', async () => {
      const result = await service.exportSession('sess_empty', 'csv');
      expect(result.content).toContain('# Session Summary');
    });

    it('exports HTML without crashing', async () => {
      const result = await service.exportSession('sess_empty', 'html');
      expect(result.content).toContain('sess_empty');
    });
  });
});
