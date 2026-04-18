import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  validateConfigSafe,
  validateSaaSAppConfig,
  validateSaaSAppConfigSafe,
  openQAConfigSchema,
  saasAppConfigSchema,
} from '../../../agent/config/schema.js';

describe('openQAConfigSchema', () => {
  it('should apply defaults for minimal valid config', () => {
    const minimal = {
      llm: {},
      saas: {},
      agent: {},
      web: {},
      database: {},
    };
    const result = openQAConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.llm.provider).toBe('openai');
      expect(result.data.saas.url).toBe('');
      expect(result.data.saas.authType).toBe('none');
      expect(result.data.agent.intervalMs).toBe(3600000);
      expect(result.data.agent.maxIterations).toBe(20);
      expect(result.data.agent.autoStart).toBe(false);
      expect(result.data.web.port).toBe(4242);
      expect(result.data.web.host).toBe('0.0.0.0');
      expect(result.data.database.path).toBe('./data/openqa.db');
    }
  });

  it('should reject invalid LLM provider', () => {
    const result = validateConfigSafe({
      llm: { provider: 'invalid' },
      saas: {},
      agent: {},
      web: {},
      database: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('provider'))).toBe(true);
    }
  });

  it('should reject invalid port number', () => {
    const result = validateConfigSafe({
      llm: {},
      saas: {},
      agent: {},
      web: { port: 99999 },
      database: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('web.port'))).toBe(true);
    }
  });

  it('should reject negative intervalMs', () => {
    const result = validateConfigSafe({
      llm: {},
      saas: {},
      agent: { intervalMs: -1 },
      web: {},
      database: {},
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional github config', () => {
    const result = validateConfigSafe({
      llm: {},
      saas: {},
      agent: {},
      web: {},
      database: {},
      github: { token: 'ghp_test123', owner: 'orka', repo: 'openqa' },
    });
    expect(result.success).toBe(true);
  });

  it('should accept github config with empty token (public repos work without auth)', () => {
    const result = validateConfigSafe({
      llm: {},
      saas: {},
      agent: {},
      web: {},
      database: {},
      github: { token: '', owner: 'orka', repo: 'openqa' },
    });
    expect(result.success).toBe(true);
  });

  it('validateConfig should throw on invalid config', () => {
    expect(() => validateConfig({ llm: { provider: 'bad' } })).toThrow();
  });
});

describe('saasAppConfigSchema', () => {
  it('should validate a complete SaaS config', () => {
    const config = {
      name: 'My App',
      description: 'Test app',
      url: 'https://example.com',
      directives: ['Test forms'],
    };
    const result = saasAppConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = validateSaaSAppConfigSafe({
      description: 'Test',
      url: 'https://example.com',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    }
  });

  it('should reject invalid URL', () => {
    const result = validateSaaSAppConfigSafe({
      name: 'App',
      description: 'Test',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional auth info', () => {
    const result = validateSaaSAppConfigSafe({
      name: 'App',
      description: 'Test',
      url: 'https://example.com',
      authInfo: {
        type: 'basic',
        testCredentials: { username: 'admin', password: 'pass' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('validateSaaSAppConfig should throw on invalid config', () => {
    expect(() => validateSaaSAppConfig({ name: '' })).toThrow();
  });
});
