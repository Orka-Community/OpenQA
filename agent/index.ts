import { ReActAgent } from '@orka-js/agent';
import { OpenAIAdapter } from '@orka-js/openai';
import { AnthropicAdapter } from '@orka-js/anthropic';
import { SessionMemory } from '@orka-js/memory-store';
import { Tracer } from '@orka-js/observability';
import { EventEmitter } from 'events';
import { OpenQADatabase } from '../database/index.js';
import { ConfigManager } from './config/index.js';
import { BrowserTools } from './tools/browser.js';
import { GitHubTools } from './tools/github.js';
import { KanbanTools } from './tools/kanban.js';
import { GitListener, GitEvent } from './webhooks/git-listener.js';
import { SpecialistAgentManager, AgentType, AgentStatus } from './specialists/index.js';
import { SkillManager, Skill } from './skills/index.js';

export class OpenQAAgent extends EventEmitter {
  private agent: ReActAgent | null = null;
  private db: OpenQADatabase;
  private config: ConfigManager;
  private browserTools: BrowserTools | null = null;
  private sessionId: string = '';
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // New v2 features
  private gitListener: GitListener | null = null;
  private specialistManager: SpecialistAgentManager | null = null;
  private skillManager: SkillManager;

  constructor(configPath?: string) {
    super();
    this.config = new ConfigManager(configPath);
    this.db = new OpenQADatabase(this.config.get('database.path') || undefined);
    this.skillManager = new SkillManager(this.db);
  }

  private createLLMAdapter() {
    const cfg = this.config.getConfig();
    
    switch (cfg.llm.provider) {
      case 'anthropic':
        return new AnthropicAdapter({
          apiKey: cfg.llm.apiKey || process.env.ANTHROPIC_API_KEY!,
          model: cfg.llm.model || 'claude-3-5-sonnet-20241022'
        });
      case 'openai':
      default:
        return new OpenAIAdapter({
          apiKey: cfg.llm.apiKey || process.env.OPENAI_API_KEY!,
          model: cfg.llm.model || 'gpt-4'
        });
    }
  }

  async initialize(triggerType: 'manual' | 'scheduled' | 'merge' | 'pipeline' | 'webhook' = 'manual', triggerData?: any) {
    const cfg = this.config.getConfig();
    this.sessionId = `session_${Date.now()}`;

    this.db.createSession(this.sessionId, {
      config: cfg,
      started_at: new Date().toISOString(),
      trigger_type: triggerType,
      trigger_data: triggerData ? JSON.stringify(triggerData) : null
    });

    this.browserTools = new BrowserTools(this.db, this.sessionId);
    const githubTools = new GitHubTools(this.db, this.sessionId, cfg.github || {});
    const kanbanTools = new KanbanTools(this.db, this.sessionId);

    const allTools = [
      ...this.browserTools.getTools(),
      ...githubTools.getTools(),
      ...kanbanTools.getTools()
    ];

    const llm = this.createLLMAdapter();
    const memory = new SessionMemory({ maxMessages: 50 });
    const tracer = new Tracer({ logLevel: 'info' });

    // Get enabled skills and generate skill prompt
    const enabledSkills = this.skillManager.getEnabledSkills();
    const skillPrompt = this.skillManager.generateSkillPrompt(enabledSkills);

    const agentConfig = {
      goal: "Test the SaaS application comprehensively and identify bugs",
      tools: allTools,
      tracer,
      maxIterations: cfg.agent.maxIterations,
      systemPrompt: `You are OpenQA, an autonomous QA testing agent - intelligent and thorough like a senior QA engineer.

Your mission:
1. **Systematically test the SaaS application** at ${cfg.saas.url}
2. **Create comprehensive test flows** - think like a real user AND a security expert
3. **Identify bugs and issues** - UI bugs, console errors, broken flows, UX issues, security vulnerabilities
4. **Report findings appropriately**:
   - Use create_github_issue for critical bugs requiring developer attention
   - Use create_kanban_ticket for QA tracking, minor issues, or improvements
   - You can create BOTH for critical bugs
5. **Learn from previous sessions** - avoid repeating the same tests
6. **Spawn specialist agents** when needed for deep testing (security, forms, etc.)

Testing strategy:
- Start with core user flows (signup, login, main features)
- Test edge cases and error handling
- Check for console errors and network issues
- Test security (SQL injection, XSS, auth bypass)
- Test forms thoroughly (validation, edge cases)
- Take screenshots as evidence
- Document steps to reproduce clearly

Reporting guidelines:
- **Critical/High severity** → GitHub issue + Kanban ticket
- **Medium severity** → Kanban ticket (optionally GitHub if it blocks users)
- **Low severity/Improvements** → Kanban ticket only

${skillPrompt}

Always provide clear, actionable information with steps to reproduce. Think step by step like a human QA expert.`
    };

    this.agent = new ReActAgent(agentConfig, llm, memory);

    // Initialize specialist manager
    this.specialistManager = new SpecialistAgentManager(
      this.db,
      this.sessionId,
      { provider: cfg.llm.provider, apiKey: cfg.llm.apiKey || '' },
      this.browserTools
    );

    // Forward specialist events
    this.specialistManager.on('agent-created', (status: AgentStatus) => this.emit('specialist-created', status));
    this.specialistManager.on('agent-started', (status: AgentStatus) => this.emit('specialist-started', status));
    this.specialistManager.on('agent-completed', (data: any) => this.emit('specialist-completed', data));
    this.specialistManager.on('agent-failed', (data: any) => this.emit('specialist-failed', data));

    console.log(`✅ OpenQA Agent initialized (Session: ${this.sessionId})`);
  }

  async runSession() {
    if (!this.agent) {
      await this.initialize();
    }

    const cfg = this.config.getConfig();
    console.log(`🚀 Starting test session for ${cfg.saas.url}`);

    try {
      const result = await this.agent!.run(
        `Continue testing the application at ${cfg.saas.url}. Review previous findings, create new test scenarios, and report any issues discovered. Focus on areas not yet tested.`
      );

      this.db.updateSession(this.sessionId, {
        status: 'completed',
        ended_at: new Date().toISOString()
      });

      console.log('✅ Test session completed:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Session error:', error);
      
      this.db.updateSession(this.sessionId, {
        status: 'failed',
        ended_at: new Date().toISOString()
      });

      throw error;
    } finally {
      if (this.browserTools) {
        await this.browserTools.close();
      }
    }
  }

  async startAutonomous() {
    if (this.isRunning) {
      console.log('⚠️  Agent is already running');
      return;
    }

    this.isRunning = true;
    const cfg = this.config.getConfig();
    
    console.log(`🤖 OpenQA Agent starting in autonomous mode`);
    console.log(`📍 Target: ${cfg.saas.url}`);
    console.log(`⏱️  Interval: ${cfg.agent.intervalMs}ms (${cfg.agent.intervalMs / 1000 / 60} minutes)`);

    // Start Git listener if configured
    await this.startGitListener();

    const runLoop = async () => {
      if (!this.isRunning) return;

      try {
        await this.runSession();
      } catch (error) {
        console.error('Session failed, will retry on next interval');
      }

      if (this.isRunning) {
        this.sessionId = `session_${Date.now()}`;
        this.agent = null;
        this.browserTools = null;
        
        this.intervalId = setTimeout(runLoop, cfg.agent.intervalMs);
      }
    };

    await runLoop();
  }

  stop() {
    console.log('🛑 Stopping OpenQA Agent...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    if (this.gitListener) {
      this.gitListener.stop();
      this.gitListener = null;
    }

    if (this.specialistManager) {
      this.specialistManager.stopAll();
    }

    if (this.browserTools) {
      this.browserTools.close();
    }
  }

  // Git integration
  private async startGitListener() {
    const cfg = this.config.getConfig();
    
    // Try GitHub first
    if (cfg.github?.token && cfg.github?.owner && cfg.github?.repo) {
      this.gitListener = new GitListener({
        provider: 'github',
        token: cfg.github.token,
        owner: cfg.github.owner,
        repo: cfg.github.repo,
        branch: 'main',
        pollIntervalMs: 60000
      });
    }
    // Try GitLab
    else if (this.config.get('gitlab.token') && this.config.get('gitlab.project')) {
      const [owner, repo] = (this.config.get('gitlab.project') || '').split('/');
      this.gitListener = new GitListener({
        provider: 'gitlab',
        token: this.config.get('gitlab.token') || '',
        owner,
        repo,
        branch: 'main',
        pollIntervalMs: 60000,
        gitlabUrl: this.config.get('gitlab.url') || 'https://gitlab.com'
      });
    }

    if (this.gitListener) {
      // Listen for merges to trigger tests
      this.gitListener.on('merge', async (event: GitEvent) => {
        console.log(`🔀 Merge detected! Starting test session...`);
        this.emit('git-merge', event);
        
        // Reset and run new session
        this.sessionId = `session_${Date.now()}`;
        this.agent = null;
        this.browserTools = null;
        await this.runSession();
      });

      // Listen for successful pipelines
      this.gitListener.on('pipeline-success', async (event: GitEvent) => {
        console.log(`✅ Pipeline success! Starting test session...`);
        this.emit('git-pipeline-success', event);
        
        // Reset and run new session
        this.sessionId = `session_${Date.now()}`;
        this.agent = null;
        this.browserTools = null;
        await this.runSession();
      });

      await this.gitListener.start();
      console.log(`🔗 Git listener started for ${this.gitListener ? 'repository' : 'none'}`);
    }
  }

  // Specialist agents management
  async runSecurityScan(): Promise<void> {
    if (!this.specialistManager) {
      await this.initialize();
    }
    const cfg = this.config.getConfig();
    await this.specialistManager!.runSecuritySuite(cfg.saas.url);
  }

  async runSpecialist(type: AgentType): Promise<void> {
    if (!this.specialistManager) {
      await this.initialize();
    }
    const cfg = this.config.getConfig();
    const agentId = this.specialistManager!.createSpecialist(type);
    await this.specialistManager!.runSpecialist(agentId, cfg.saas.url);
  }

  getSpecialistStatuses(): AgentStatus[] {
    return this.specialistManager?.getAllStatuses() || [];
  }

  // Skills management
  getSkills(): Skill[] {
    return this.skillManager.getAllSkills();
  }

  createSkill(data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    return this.skillManager.createSkill(data);
  }

  updateSkill(id: string, updates: Partial<Skill>): Skill | null {
    return this.skillManager.updateSkill(id, updates);
  }

  deleteSkill(id: string): boolean {
    return this.skillManager.deleteSkill(id);
  }

  toggleSkill(id: string): Skill | null {
    return this.skillManager.toggleSkill(id);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      config: this.config.getConfig(),
      gitListenerActive: !!this.gitListener,
      specialists: this.getSpecialistStatuses(),
      skills: this.skillManager.getEnabledSkills().length
    };
  }
}
