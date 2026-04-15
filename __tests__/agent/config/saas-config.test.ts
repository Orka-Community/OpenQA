import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SaaSConfigManager, DEFAULT_DIRECTIVES, createQuickConfig } from '../../../agent/config/saas-config.js';
import { OpenQADatabase } from '../../../database/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function tempDbPath() {
  return join(tmpdir(), `openqa-saas-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanFile(p: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = p + suffix;
    if (existsSync(f)) try { unlinkSync(f); } catch { /* ignore */ }
  }
}

describe('SaaSConfigManager', () => {
  let db: OpenQADatabase;
  let dbPath: string;
  let mgr: SaaSConfigManager;

  beforeEach(async () => {
    dbPath = tempDbPath();
    db = new OpenQADatabase(dbPath);
    mgr = new SaaSConfigManager(db);
    // Give the async loadConfig() a tick to settle
    await new Promise(r => setTimeout(r, 10));
  });

  afterEach(() => {
    cleanFile(dbPath);
  });

  // ── isConfigured ────────────────────────────────────────────────────────────

  describe('isConfigured()', () => {
    it('returns false before any configure() call', () => {
      expect(mgr.isConfigured()).toBe(false);
    });

    it('returns true after configure() with name + url', async () => {
      await mgr.configure({ name: 'WilooMail', description: 'Test application', url: 'https://www.wiloomail.com' });
      expect(mgr.isConfigured()).toBe(true);
    });
  });

  // ── configure ───────────────────────────────────────────────────────────────

  describe('configure()', () => {
    it('persists config and returns the stored object', async () => {
      const result = await mgr.configure({
        name: 'WilooMail',
        description: 'Email SaaS platform',
        url: 'https://www.wiloomail.com',
        directives: ['Check login', 'Verify inbox'],
      });

      expect(result.name).toBe('WilooMail');
      expect(result.url).toBe('https://www.wiloomail.com');
      expect(result.directives).toContain('Check login');
    });

    it('applies default empty directives array when none given', async () => {
      const result = await mgr.configure({ name: 'App', description: 'Test application', url: 'https://app.example.com' });
      expect(Array.isArray(result.directives)).toBe(true);
    });

    it('throws ConfigError for invalid config (missing url)', async () => {
      await expect(mgr.configure({ name: 'Bad' } as never)).rejects.toThrow();
    });

    it('throws ConfigError for invalid config (missing name)', async () => {
      await expect(mgr.configure({ url: 'https://example.com' } as never)).rejects.toThrow();
    });

    it('persists to DB and survives a new SaaSConfigManager instance', async () => {
      await mgr.configure({ name: 'Persistent', description: 'Test application', url: 'https://www.wiloomail.com' });

      // Re-create manager from same DB
      const mgr2 = new SaaSConfigManager(db);
      await new Promise(r => setTimeout(r, 20));
      const cfg = await mgr2.getConfig();
      expect(cfg?.name).toBe('Persistent');
      expect(cfg?.url).toBe('https://www.wiloomail.com');
    });
  });

  // ── directives ──────────────────────────────────────────────────────────────

  describe('directive management', () => {
    beforeEach(async () => {
      await mgr.configure({ name: 'App', description: 'Test application', url: 'https://app.example.com', directives: ['Step 1'] });
    });

    it('addDirective appends a new directive', async () => {
      await mgr.addDirective('Step 2');
      const cfg = await mgr.getConfig();
      expect(cfg?.directives).toContain('Step 1');
      expect(cfg?.directives).toContain('Step 2');
    });

    it('removeDirective removes by index', async () => {
      await mgr.addDirective('Step 2');
      await mgr.removeDirective(0); // removes 'Step 1'
      const cfg = await mgr.getConfig();
      expect(cfg?.directives).not.toContain('Step 1');
      expect(cfg?.directives).toContain('Step 2');
    });

    it('updateDirectives replaces the full list', async () => {
      await mgr.updateDirectives(['New A', 'New B']);
      const cfg = await mgr.getConfig();
      expect(cfg?.directives).toEqual(['New A', 'New B']);
    });
  });

  // ── field setters ────────────────────────────────────────────────────────────

  describe('field setters', () => {
    beforeEach(async () => {
      await mgr.configure({ name: 'App', description: 'Test application', url: 'https://app.example.com' });
    });

    it('setRepoUrl updates repoUrl', async () => {
      await mgr.setRepoUrl('https://github.com/Orka-Community/paper2any');
      const cfg = await mgr.getConfig();
      expect(cfg?.repoUrl).toBe('https://github.com/Orka-Community/paper2any');
    });

    it('setAuthInfo updates auth', async () => {
      await mgr.setAuthInfo({ type: 'basic', username: 'admin', password: 'secret' });
      const cfg = await mgr.getConfig();
      expect(cfg?.authInfo?.type).toBe('basic');
      expect(cfg?.authInfo?.username).toBe('admin');
    });
  });

  // ── export / import ──────────────────────────────────────────────────────────

  describe('exportConfig / importConfig', () => {
    it('exports valid JSON string', async () => {
      await mgr.configure({ name: 'ExportTest', description: 'Test application', url: 'https://www.wiloomail.com' });
      const json = mgr.exportConfig();
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('ExportTest');
      expect(parsed.url).toBe('https://www.wiloomail.com');
    });

    it('imports a JSON string and restores config', async () => {
      const json = JSON.stringify({ name: 'Imported', description: 'Imported app', url: 'https://imported.example.com', directives: ['d1'] });
      const result = await mgr.importConfig(json);
      expect(result.name).toBe('Imported');
      expect(result.directives).toContain('d1');
    });
  });

  // ── getConfigSync ────────────────────────────────────────────────────────────

  describe('getConfigSync()', () => {
    it('returns null before any configure()', () => {
      expect(mgr.getConfigSync()).toBeNull();
    });

    it('returns config after configure()', async () => {
      await mgr.configure({ name: 'Sync', description: 'Test application', url: 'https://sync.example.com' });
      expect(mgr.getConfigSync()?.name).toBe('Sync');
    });
  });
});

// ── standalone helpers ────────────────────────────────────────────────────────

describe('DEFAULT_DIRECTIVES', () => {
  it('exports an array of non-empty strings', () => {
    expect(Array.isArray(DEFAULT_DIRECTIVES)).toBe(true);
    expect(DEFAULT_DIRECTIVES.length).toBeGreaterThan(0);
    for (const d of DEFAULT_DIRECTIVES) {
      expect(typeof d).toBe('string');
      expect(d.length).toBeGreaterThan(0);
    }
  });
});

describe('createQuickConfig()', () => {
  it('creates a config with the given name, description, and url', () => {
    const cfg = createQuickConfig('WilooMail', 'Email platform', 'https://www.wiloomail.com');
    expect(cfg.name).toBe('WilooMail');
    expect(cfg.description).toBe('Email platform');
    expect(cfg.url).toBe('https://www.wiloomail.com');
    expect(cfg.authInfo?.type).toBe('none');
  });

  it('applies DEFAULT_DIRECTIVES when no custom directives given', () => {
    const cfg = createQuickConfig('App', 'desc', 'https://app.example.com');
    expect(cfg.directives).toEqual(DEFAULT_DIRECTIVES);
  });

  it('applies custom directives when provided', () => {
    const custom = ['Check login form', 'Verify inbox'];
    const cfg = createQuickConfig('App', 'desc', 'https://app.example.com', { directives: custom });
    expect(cfg.directives).toEqual(custom);
  });

  it('includes repoUrl when provided', () => {
    const cfg = createQuickConfig('App', 'desc', 'https://app.example.com', {
      repoUrl: 'https://github.com/Orka-Community/paper2any',
    });
    expect(cfg.repoUrl).toBe('https://github.com/Orka-Community/paper2any');
  });
});
