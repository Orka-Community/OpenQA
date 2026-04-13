import { config as dotenvConfig } from 'dotenv';
import { OpenQADatabase } from '../../database/index.js';
import { validateConfigSafe, type ValidatedOpenQAConfig } from './schema.js';
import { logger } from '../logger.js';

dotenvConfig();

export type OpenQAConfig = ValidatedOpenQAConfig;

export class ConfigManager {
  private db: OpenQADatabase | null = null;
  private envConfig: OpenQAConfig;

  constructor(dbPath?: string) {
    // Don't initialize database in constructor to avoid async issues
    this.envConfig = this.loadFromEnv();
  }

  private loadFromEnv(): OpenQAConfig {
    const raw = {
      llm: {
        provider: process.env.LLM_PROVIDER || 'openai',
        apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
        model: process.env.LLM_MODEL,
        baseUrl: process.env.OLLAMA_BASE_URL
      },
      saas: {
        url: process.env.SAAS_URL || '',
        authType: process.env.SAAS_AUTH_TYPE || 'none',
        username: process.env.SAAS_USERNAME,
        password: process.env.SAAS_PASSWORD
      },
      github: process.env.GITHUB_TOKEN ? {
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER || '',
        repo: process.env.GITHUB_REPO || ''
      } : undefined,
      agent: {
        intervalMs: parseInt(process.env.AGENT_INTERVAL_MS || '3600000'),
        maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '20'),
        autoStart: process.env.AGENT_AUTO_START === 'true'
      },
      web: {
        port: parseInt(process.env.WEB_PORT || '4242'),
        host: process.env.WEB_HOST || '0.0.0.0'
      },
      database: {
        path: process.env.DB_PATH || './data/openqa.db'
      },
      notifications: {
        slack: process.env.SLACK_WEBHOOK_URL,
        discord: process.env.DISCORD_WEBHOOK_URL
      }
    };

    const result = validateConfigSafe(raw);
    if (!result.success) {
      logger.warn('Config validation warnings', { errors: result.errors });
      // Return raw config with type assertion — Zod defaults won't apply but app can still start
      return raw as OpenQAConfig;
    }
    return result.data;
  }

  private getDB(): OpenQADatabase {
    if (!this.db) {
      // Mirror the same path resolution as daemon.ts so reads and writes go to the same file
      const raw = process.env.DB_PATH || this.envConfig.database?.path || './data/openqa.json';
      // ConfigManager always uses LowDB (JSON) — normalize .db → .json to stay on the same file
      const resolved = raw.endsWith('.db') ? raw.replace(/\.db$/, '.json') : raw;
      this.db = new OpenQADatabase(resolved);
    }
    return this.db;
  }

  async get(key: string): Promise<string | null> {
    const dbValue = await this.getDB().getConfig(key);
    if (dbValue) return dbValue;

    // Re-read from process.env on every call so env vars saved at runtime
    // (via the Env Variables page, which updates process.env) are visible
    // without requiring a server restart.
    const freshEnv = this.loadFromEnv();
    const keys = key.split('.');
    let value: unknown = freshEnv;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }
    return value != null ? String(value) : null;
  }

  async set(key: string, value: string) {
    await this.getDB().setConfig(key, value);
  }

  async getAll(): Promise<OpenQAConfig> {
    const dbConfig = await this.getDB().getAllConfig();
    // Always re-read from process.env so runtime env changes (Env Variables page)
    // are visible immediately without a restart.
    const merged = { ...this.loadFromEnv() };

    for (const [key, value] of Object.entries(dbConfig)) {
      const keys = key.split('.');
      let obj: Record<string, unknown> = merged as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
    }

    return merged;
  }

  async getConfig(): Promise<OpenQAConfig> {
    return await this.getAll();
  }

  // Synchronous version that only uses env vars (no DB)
  getConfigSync(): OpenQAConfig {
    return this.envConfig;
  }
}
