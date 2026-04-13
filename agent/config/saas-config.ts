import { SaaSConfig } from '../brain/index.js';
import { OpenQADatabase } from '../../database/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateSaaSAppConfigSafe } from './schema.js';
import { ConfigError } from '../errors.js';

export class SaaSConfigManager {
  private db: OpenQADatabase;
  private config: SaaSConfig | null = null;

  constructor(db: OpenQADatabase) {
    this.db = db;
    // Load config asynchronously - will be available after first await
    this.loadConfig().catch(() => {});
  }

  private async loadConfig() {
    try {
      const configJson = await this.db.getConfig('saas.config');
      if (configJson) {
        this.config = JSON.parse(configJson);
      }
    } catch (e) {
      // Config not found or invalid, will be set via configure()
    }
  }

  private async saveConfig() {
    if (!this.config) return;
    try {
      await this.db.setConfig('saas.config', JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save SaaS config:', e);
    }
  }

  async configure(config: SaaSConfig): Promise<SaaSConfig> {
    const result = validateSaaSAppConfigSafe(config);
    if (!result.success) {
      throw new ConfigError('Invalid SaaS configuration: ' + result.errors.join(', '));
    }

    this.config = {
      ...config,
      techStack: config.techStack || this.detectTechStack(config.localPath),
      directives: config.directives || []
    };
    await this.saveConfig();
    return this.config;
  }

  private detectTechStack(localPath?: string): string[] {
    if (!localPath || !existsSync(localPath)) return [];

    const stack: string[] = [];

    try {
      const pkgPath = join(localPath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['react']) stack.push('React');
        if (deps['vue']) stack.push('Vue');
        if (deps['svelte']) stack.push('Svelte');
        if (deps['angular']) stack.push('Angular');
        if (deps['next']) stack.push('Next.js');
        if (deps['nuxt']) stack.push('Nuxt');
        if (deps['express']) stack.push('Express');
        if (deps['fastify']) stack.push('Fastify');
        if (deps['nestjs'] || deps['@nestjs/core']) stack.push('NestJS');
        if (deps['prisma'] || deps['@prisma/client']) stack.push('Prisma');
        if (deps['mongoose']) stack.push('MongoDB');
        if (deps['pg'] || deps['postgres']) stack.push('PostgreSQL');
        if (deps['mysql'] || deps['mysql2']) stack.push('MySQL');
        if (deps['redis'] || deps['ioredis']) stack.push('Redis');
        if (deps['typescript']) stack.push('TypeScript');
        if (deps['tailwindcss']) stack.push('TailwindCSS');
      }

      if (existsSync(join(localPath, 'requirements.txt')) || existsSync(join(localPath, 'pyproject.toml'))) {
        stack.push('Python');
      }

      if (existsSync(join(localPath, 'go.mod'))) {
        stack.push('Go');
      }

      if (existsSync(join(localPath, 'Cargo.toml'))) {
        stack.push('Rust');
      }

    } catch (e) {
    }

    return stack;
  }

  async addDirective(directive: string) {
    if (!this.config) return;
    if (!this.config.directives) this.config.directives = [];
    this.config.directives.push(directive);
    await this.saveConfig();
  }

  async removeDirective(index: number) {
    if (!this.config?.directives) return;
    this.config.directives.splice(index, 1);
    await this.saveConfig();
  }

  async updateDirectives(directives: string[]) {
    if (!this.config) return;
    this.config.directives = directives;
    await this.saveConfig();
  }

  async setRepoUrl(url: string) {
    if (!this.config) return;
    this.config.repoUrl = url;
    await this.saveConfig();
  }

  async setLocalPath(path: string) {
    if (!this.config) return;
    this.config.localPath = path;
    this.config.techStack = this.detectTechStack(path);
    await this.saveConfig();
  }

  async setAuthInfo(authInfo: SaaSConfig['authInfo']) {
    if (!this.config) return;
    this.config.authInfo = authInfo;
    await this.saveConfig();
  }

  isConfigured(): boolean {
    return this.config !== null && !!this.config.name && !!this.config.url;
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async importConfig(json: string): Promise<SaaSConfig> {
    const config = JSON.parse(json) as SaaSConfig;
    return await this.configure(config);
  }

  async getConfig(): Promise<SaaSConfig | null> {
    await this.loadConfig();
    return this.config;
  }

  getConfigSync(): SaaSConfig | null {
    return this.config;
  }
}

export const DEFAULT_DIRECTIVES = [
  "Test all forms for validation errors and edge cases",
  "Check for security vulnerabilities (XSS, SQL injection, CSRF)",
  "Verify authentication and authorization work correctly",
  "Test responsive design on mobile viewports",
  "Check for accessibility issues (WCAG compliance)",
  "Monitor console for JavaScript errors",
  "Test error handling and user feedback",
  "Verify all links work and navigation is correct"
];

export function createQuickConfig(
  name: string,
  description: string,
  url: string,
  options?: {
    repoUrl?: string;
    localPath?: string;
    directives?: string[];
  }
): SaaSConfig {
  return {
    name,
    description,
    url,
    repoUrl: options?.repoUrl,
    localPath: options?.localPath,
    directives: options?.directives || DEFAULT_DIRECTIVES,
    authInfo: { type: 'none' }
  };
}
