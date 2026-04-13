import { z } from 'zod';

export const llmConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'ollama']).default('openai'),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
});

export const saasConfigSchema = z.object({
  url: z.string().default(''),
  authType: z.enum(['none', 'basic', 'bearer', 'session']).default('none'),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const githubConfigSchema = z.object({
  token: z.string().min(1, 'GITHUB_TOKEN is required when GitHub is configured'),
  owner: z.string().default(''),
  repo: z.string().default(''),
});

export const agentConfigSchema = z.object({
  intervalMs: z.number().int().positive().default(3600000),
  maxIterations: z.number().int().positive().default(20),
  autoStart: z.boolean().default(false),
});

export const webConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(4242),
  host: z.string().default('0.0.0.0'),
});

export const databaseConfigSchema = z.object({
  path: z.string().default('./data/openqa.db'),
});

export const notificationsConfigSchema = z.object({
  slack: z.string().url().optional(),
  discord: z.string().url().optional(),
});

export const openQAConfigSchema = z.object({
  llm: llmConfigSchema,
  saas: saasConfigSchema,
  github: githubConfigSchema.optional(),
  agent: agentConfigSchema,
  web: webConfigSchema,
  database: databaseConfigSchema,
  notifications: notificationsConfigSchema.optional(),
});

export type ValidatedOpenQAConfig = z.infer<typeof openQAConfigSchema>;

// SaaS application config (used by brain/SaaSConfigManager)
export const saasAppConfigSchema = z.object({
  name: z.string().min(1, 'SaaS application name is required'),
  description: z.string().min(1, 'SaaS application description is required'),
  url: z.string().url('SaaS application URL must be a valid URL'),
  repoUrl: z.string().url().optional(),
  localPath: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  authInfo: z.object({
    type: z.enum(['none', 'basic', 'oauth', 'session']),
    testCredentials: z.object({
      username: z.string(),
      password: z.string(),
    }).optional(),
  }).optional(),
  directives: z.array(z.string()).optional(),
});

export type ValidatedSaaSAppConfig = z.infer<typeof saasAppConfigSchema>;

export function validateSaaSAppConfig(config: unknown): ValidatedSaaSAppConfig {
  return saasAppConfigSchema.parse(config);
}

export function validateSaaSAppConfigSafe(config: unknown): { success: true; data: ValidatedSaaSAppConfig } | { success: false; errors: string[] } {
  const result = saasAppConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}

export function validateConfig(config: unknown): ValidatedOpenQAConfig {
  return openQAConfigSchema.parse(config);
}

export function validateConfigSafe(config: unknown): { success: true; data: ValidatedOpenQAConfig } | { success: false; errors: string[] } {
  const result = openQAConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
