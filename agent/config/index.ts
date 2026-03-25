import { config as dotenvConfig } from 'dotenv';
import { OpenQADatabase } from '../../database/index.js';

dotenvConfig();

export interface OpenQAConfig {
  llm: {
    provider: 'openai' | 'anthropic' | 'ollama';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };
  saas: {
    url: string;
    authType: 'none' | 'basic' | 'session';
    username?: string;
    password?: string;
  };
  github?: {
    token: string;
    owner: string;
    repo: string;
  };
  agent: {
    intervalMs: number;
    maxIterations: number;
    autoStart: boolean;
  };
  web: {
    port: number;
    host: string;
  };
  database: {
    path: string;
  };
  notifications?: {
    slack?: string;
    discord?: string;
  };
}

export class ConfigManager {
  private db: OpenQADatabase;
  private envConfig: OpenQAConfig;

  constructor(dbPath?: string) {
    this.db = new OpenQADatabase(dbPath || process.env.DB_PATH || './data/openqa.db');
    this.envConfig = this.loadFromEnv();
  }

  private loadFromEnv(): OpenQAConfig {
    return {
      llm: {
        provider: (process.env.LLM_PROVIDER as any) || 'openai',
        apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
        model: process.env.LLM_MODEL,
        baseUrl: process.env.OLLAMA_BASE_URL
      },
      saas: {
        url: process.env.SAAS_URL || '',
        authType: (process.env.SAAS_AUTH_TYPE as any) || 'none',
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
        port: parseInt(process.env.WEB_PORT || '3000'),
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
  }

  get(key: string): string | null {
    const dbValue = this.db.getConfig(key);
    if (dbValue) return dbValue;

    const keys = key.split('.');
    let value: any = this.envConfig;
    for (const k of keys) {
      value = value?.[k];
    }
    return value?.toString() || null;
  }

  set(key: string, value: string) {
    this.db.setConfig(key, value);
  }

  getAll(): OpenQAConfig {
    const dbConfig = this.db.getAllConfig();
    const merged = { ...this.envConfig };

    for (const [key, value] of Object.entries(dbConfig)) {
      const keys = key.split('.');
      let obj: any = merged;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
    }

    return merged;
  }

  getConfig(): OpenQAConfig {
    return this.getAll();
  }
}
