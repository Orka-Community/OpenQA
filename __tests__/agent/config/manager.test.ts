import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

// Static import: dotenvConfig() runs once at module-load time.
// loadFromEnv() in the constructor always re-reads process.env fresh,
// so manipulating process.env before calling `new ConfigManager()` works correctly.
import { ConfigManager } from '../../../agent/config/index.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function tempPath() {
  return join(tmpdir(), `openqa-cfg-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanFile(p: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = p + suffix;
    if (existsSync(f)) try { unlinkSync(f); } catch { /* ignore */ }
  }
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('ConfigManager', () => {
  let savedEnv: Record<string, string | undefined>;
  let dbPath: string;

  beforeEach(() => {
    // Snapshot every key we might touch so we can restore precisely
    savedEnv = {};
    for (const k of [
      'GITHUB_REPO', 'GITHUB_OWNER', 'GITHUB_TOKEN',
      'SAAS_URL', 'SAAS_AUTH_TYPE', 'SAAS_USERNAME', 'SAAS_PASSWORD',
      'LLM_PROVIDER', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
      'DB_PATH', 'WEB_PORT', 'AGENT_INTERVAL_MS', 'AGENT_MAX_ITERATIONS',
      'AGENT_AUTO_START', 'SLACK_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL',
    ]) {
      savedEnv[k] = process.env[k];
    }

    dbPath = tempPath();
    process.env.DB_PATH = dbPath;
  });

  afterEach(() => {
    // Restore env exactly
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    cleanFile(dbPath);
  });

  // ── GITHUB_REPO normalization ──────────────────────────────────────────────

  describe('GITHUB_REPO normalization', () => {
    it('parses a full HTTPS GitHub URL', () => {
      process.env.GITHUB_REPO = 'https://github.com/Orka-Community/paper2any';
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('Orka-Community');
      expect(cfg.github?.repo).toBe('paper2any');
    });

    it('parses a full HTTPS GitHub URL with .git suffix', () => {
      process.env.GITHUB_REPO = 'https://github.com/Orka-Community/paper2any.git';
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('Orka-Community');
      expect(cfg.github?.repo).toBe('paper2any');
    });

    it('parses owner/repo shorthand', () => {
      process.env.GITHUB_REPO = 'Orka-Community/paper2any';
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('Orka-Community');
      expect(cfg.github?.repo).toBe('paper2any');
    });

    it('keeps GITHUB_OWNER when separately set and GITHUB_REPO is just a name', () => {
      process.env.GITHUB_REPO = 'paper2any';
      process.env.GITHUB_OWNER = 'Orka-Community';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('Orka-Community');
      expect(cfg.github?.repo).toBe('paper2any');
    });

    it('GITHUB_OWNER from env takes precedence over URL-derived owner', () => {
      process.env.GITHUB_REPO = 'https://github.com/some-org/paper2any';
      process.env.GITHUB_OWNER = 'Orka-Community'; // explicit override
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('Orka-Community');
      expect(cfg.github?.repo).toBe('paper2any');
    });

    it('produces empty owner/repo when GITHUB_REPO is not set', () => {
      delete process.env.GITHUB_REPO;
      delete process.env.GITHUB_OWNER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.owner).toBe('');
      expect(cfg.github?.repo).toBe('');
    });

    it('includes GITHUB_TOKEN in config', () => {
      process.env.GITHUB_TOKEN = 'ghp_testtoken';
      process.env.GITHUB_REPO = 'Orka-Community/paper2any';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.github?.token).toBe('ghp_testtoken');
    });
  });

  // ── SAAS_URL loading ───────────────────────────────────────────────────────

  describe('SAAS_URL loading', () => {
    it('loads SAAS_URL from env', () => {
      process.env.SAAS_URL = 'https://www.wiloomail.com';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.saas?.url).toBe('https://www.wiloomail.com');
    });

    it('returns empty string when SAAS_URL is not set', () => {
      delete process.env.SAAS_URL;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.saas?.url).toBe('');
    });

    it('loads SAAS auth fields', () => {
      process.env.SAAS_URL = 'https://www.wiloomail.com';
      process.env.SAAS_AUTH_TYPE = 'basic';
      process.env.SAAS_USERNAME = 'testuser';
      process.env.SAAS_PASSWORD = 'secret';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.saas?.authType).toBe('basic');
      expect(cfg.saas?.username).toBe('testuser');
      expect(cfg.saas?.password).toBe('secret');
    });
  });

  // ── LLM config ────────────────────────────────────────────────────────────

  describe('LLM config', () => {
    it('defaults provider to openai', () => {
      delete process.env.LLM_PROVIDER;
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.llm?.provider).toBe('openai');
    });

    it('loads OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.llm?.apiKey).toBe('sk-test123456789');
    });

    it('loads ANTHROPIC_API_KEY as fallback when OPENAI is absent', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const mgr = new ConfigManager();
      const cfg = mgr.getConfigSync();
      expect(cfg.llm?.apiKey).toBe('sk-ant-test');
    });
  });

  // ── Agent config ──────────────────────────────────────────────────────────

  describe('agent config defaults', () => {
    it('defaults intervalMs to 3600000', () => {
      delete process.env.AGENT_INTERVAL_MS;
      const mgr = new ConfigManager();
      expect(mgr.getConfigSync().agent?.intervalMs).toBe(3_600_000);
    });

    it('defaults maxIterations to 20', () => {
      delete process.env.AGENT_MAX_ITERATIONS;
      const mgr = new ConfigManager();
      expect(mgr.getConfigSync().agent?.maxIterations).toBe(20);
    });

    it('defaults autoStart to false', () => {
      delete process.env.AGENT_AUTO_START;
      const mgr = new ConfigManager();
      expect(mgr.getConfigSync().agent?.autoStart).toBe(false);
    });
  });

  // ── DB persistence via get/set ─────────────────────────────────────────────

  describe('DB persistence via get/set', () => {
    it('stores and retrieves a config value', async () => {
      const mgr = new ConfigManager();
      await mgr.set('test.mykey', 'hello');
      const val = await mgr.get('test.mykey');
      expect(val).toBe('hello');
    });

    it('returns env value when key not in DB', async () => {
      process.env.WEB_PORT = '9090';
      const mgr = new ConfigManager();
      const val = await mgr.get('web.port');
      expect(val).toBe('9090');
    });

    it('getAll merges DB config over env config', async () => {
      const mgr = new ConfigManager();
      await mgr.set('web.port', '7777');
      const all = await mgr.getAll();
      expect((all as Record<string, unknown> & { web?: { port: unknown } }).web?.port).toBe('7777');
    });

    it('getConfig() returns same result as getAll()', async () => {
      const mgr = new ConfigManager();
      const a = await mgr.getAll();
      const b = await mgr.getConfig();
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });
});
