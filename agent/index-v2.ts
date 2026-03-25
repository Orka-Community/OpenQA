import { EventEmitter } from 'events';
import { OpenQADatabase } from '../database/index.js';
import { ConfigManager } from './config/index.js';
import { SaaSConfigManager, createQuickConfig } from './config/saas-config.js';
import { OpenQABrain, SaaSConfig, GeneratedTest, DynamicAgent } from './brain/index.js';
import { BrowserTools } from './tools/browser.js';
import { GitHubTools } from './tools/github.js';
import { KanbanTools } from './tools/kanban.js';
import { GitListener, GitEvent } from './webhooks/git-listener.js';

export class OpenQAAgentV2 extends EventEmitter {
  private db: OpenQADatabase;
  private config: ConfigManager;
  private saasConfigManager: SaaSConfigManager;
  private brain: OpenQABrain | null = null;
  private browserTools: BrowserTools | null = null;
  private gitListener: GitListener | null = null;
  private sessionId: string = '';
  private isRunning: boolean = false;

  constructor(configPath?: string) {
    super();
    this.config = new ConfigManager(configPath);
    this.db = new OpenQADatabase(this.config.get('database.path') || undefined);
    this.saasConfigManager = new SaaSConfigManager(this.db);
  }

  /**
   * Configure the SaaS application to test
   * This is the main entry point for users
   */
  configureSaaS(config: {
    name: string;
    description: string;
    url: string;
    repoUrl?: string;
    localPath?: string;
    directives?: string[];
    auth?: {
      type: 'none' | 'basic' | 'oauth' | 'session';
      credentials?: { username: string; password: string };
    };
  }): SaaSConfig {
    const saasConfig: SaaSConfig = {
      name: config.name,
      description: config.description,
      url: config.url,
      repoUrl: config.repoUrl,
      localPath: config.localPath,
      directives: config.directives,
      authInfo: config.auth ? {
        type: config.auth.type,
        testCredentials: config.auth.credentials
      } : { type: 'none' }
    };

    return this.saasConfigManager.configure(saasConfig);
  }

  /**
   * Quick setup with minimal configuration
   */
  quickSetup(name: string, description: string, url: string): SaaSConfig {
    return this.saasConfigManager.configure(
      createQuickConfig(name, description, url)
    );
  }

  /**
   * Add a directive (instruction for the agent)
   */
  addDirective(directive: string) {
    this.saasConfigManager.addDirective(directive);
  }

  /**
   * Set repository URL for code analysis
   */
  setRepository(url: string) {
    this.saasConfigManager.setRepoUrl(url);
  }

  /**
   * Set local path for code analysis
   */
  setLocalPath(path: string) {
    this.saasConfigManager.setLocalPath(path);
  }

  /**
   * Initialize the brain and start analyzing
   */
  async initialize() {
    const saasConfig = this.saasConfigManager.getConfig();
    if (!saasConfig) {
      throw new Error('SaaS not configured. Call configureSaaS() first.');
    }

    const cfg = this.config.getConfig();
    this.sessionId = `session_${Date.now()}`;

    this.db.createSession(this.sessionId, {
      saas: saasConfig,
      started_at: new Date().toISOString()
    });

    this.brain = new OpenQABrain(
      this.db,
      { 
        provider: cfg.llm.provider, 
        apiKey: cfg.llm.apiKey || process.env.OPENAI_API_KEY || '',
        model: cfg.llm.model
      },
      saasConfig
    );

    this.browserTools = new BrowserTools(this.db, this.sessionId);

    // Forward brain events
    this.brain.on('test-generated', (test: GeneratedTest) => {
      this.emit('test-generated', test);
      console.log(`🧪 Test generated: ${test.name} (${test.type})`);
    });

    this.brain.on('agent-created', (agent: DynamicAgent) => {
      this.emit('agent-created', agent);
      console.log(`🤖 Agent created: ${agent.name}`);
    });

    this.brain.on('test-started', (test: GeneratedTest) => {
      this.emit('test-started', test);
    });

    this.brain.on('test-completed', (test: GeneratedTest) => {
      this.emit('test-completed', test);
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} Test ${test.status}: ${test.name}`);
    });

    this.brain.on('thinking', (thought: any) => {
      this.emit('thinking', thought);
    });

    this.brain.on('analysis-complete', (analysis: any) => {
      this.emit('analysis-complete', analysis);
    });

    this.brain.on('session-complete', (stats: any) => {
      this.emit('session-complete', stats);
    });

    console.log(`✅ OpenQA initialized for: ${saasConfig.name}`);
    console.log(`📍 URL: ${saasConfig.url}`);
    if (saasConfig.repoUrl) console.log(`📦 Repo: ${saasConfig.repoUrl}`);
    if (saasConfig.localPath) console.log(`📁 Local: ${saasConfig.localPath}`);
    console.log(`📋 Directives: ${saasConfig.directives?.length || 0}`);
  }

  /**
   * Run the brain in autonomous mode
   * The agent will analyze, think, generate tests, and execute them
   */
  async runAutonomous(maxIterations: number = 10) {
    if (!this.brain) {
      await this.initialize();
    }

    this.isRunning = true;
    console.log(`\n🧠 Starting autonomous QA session...`);
    
    await this.brain!.runAutonomously(maxIterations);
    
    this.isRunning = false;
  }

  /**
   * Analyze the application and get suggestions
   */
  async analyze() {
    if (!this.brain) {
      await this.initialize();
    }

    return this.brain!.analyze();
  }

  /**
   * Generate a specific test
   */
  async generateTest(type: GeneratedTest['type'], target: string, context?: string) {
    if (!this.brain) {
      await this.initialize();
    }

    return this.brain!.generateTest(type, target, context);
  }

  /**
   * Create a custom agent for a specific purpose
   */
  async createAgent(purpose: string) {
    if (!this.brain) {
      await this.initialize();
    }

    return this.brain!.createDynamicAgent(purpose);
  }

  /**
   * Execute a generated test
   */
  async runTest(testId: string) {
    if (!this.brain) {
      throw new Error('Brain not initialized');
    }

    return this.brain.executeTest(testId);
  }

  /**
   * Start listening for Git events (merges, pipelines)
   */
  async startGitListener() {
    const cfg = this.config.getConfig();
    const saasConfig = this.saasConfigManager.getConfig();

    if (cfg.github?.token && cfg.github?.owner && cfg.github?.repo) {
      this.gitListener = new GitListener({
        provider: 'github',
        token: cfg.github.token,
        owner: cfg.github.owner,
        repo: cfg.github.repo,
        branch: 'main',
        pollIntervalMs: 60000
      });

      this.gitListener.on('merge', async (event: GitEvent) => {
        console.log(`🔀 Merge detected on ${event.branch}!`);
        this.emit('git-merge', event);
        
        // Run autonomous session on merge
        await this.runAutonomous();
      });

      this.gitListener.on('pipeline-success', async (event: GitEvent) => {
        console.log(`✅ Pipeline success!`);
        this.emit('git-pipeline-success', event);
        
        // Run autonomous session on successful deploy
        await this.runAutonomous();
      });

      await this.gitListener.start();
      console.log(`🔗 Git listener started`);
    }
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
    
    if (this.gitListener) {
      this.gitListener.stop();
      this.gitListener = null;
    }

    if (this.browserTools) {
      this.browserTools.close();
    }

    console.log('🛑 OpenQA stopped');
  }

  /**
   * Get all generated tests
   */
  getTests(): GeneratedTest[] {
    return this.brain?.getGeneratedTests() || [];
  }

  /**
   * Get all created agents
   */
  getAgents(): DynamicAgent[] {
    return this.brain?.getDynamicAgents() || [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      saas: this.saasConfigManager.getConfig(),
      brain: this.brain?.getStats() || null,
      gitListenerActive: !!this.gitListener
    };
  }

  /**
   * Get the SaaS configuration
   */
  getSaaSConfig(): SaaSConfig | null {
    return this.saasConfigManager.getConfig();
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return this.saasConfigManager.isConfigured();
  }
}

// Export for easy usage
export { SaaSConfig, GeneratedTest, DynamicAgent };
