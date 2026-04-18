import { ReActAgent } from '@orka-js/agent';
import { EventEmitter } from 'events';
import { logger } from '../logger.js';
import { OpenQADatabase } from '../../database/index.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { ResilientLLM } from './llm-resilience.js';
import { LLMCache } from './llm-cache.js';
import { DiffAnalyzer } from './diff-analyzer.js';
import { ProactiveKanbanManager } from './proactive-kanban.js';
import { ProjectIntelligenceAnalyzer, type ProjectIntelligence } from '../intelligence/index.js';
import { SpecialistAgentManager, type AgentType, type AgentStatus } from '../specialists/index.js';
import { BrowserTools } from '../tools/browser.js';
import { GitHubTools } from '../tools/github.js';
import { GitLabTools } from '../tools/gitlab.js';
import { KanbanTools } from '../tools/kanban.js';
import { ApiHttpTools } from '../tools/api-http.js';

export interface SaaSConfig {
  name: string;
  description: string;
  url: string;
  repoUrl?: string;
  localPath?: string;
  techStack?: string[];
  authInfo?: {
    type: 'none' | 'basic' | 'oauth' | 'session';
    testCredentials?: { username: string; password: string };
  };
  directives?: string[];
  // GitLab access (used in GitLab mode to fetch manifest files and create issues)
  gitlabToken?: string;
  gitlabUrl?: string;
}

export interface GeneratedTest {
  id: string;
  name: string;
  type: 'unit' | 'functional' | 'regression' | 'e2e' | 'security' | 'performance';
  description: string;
  code: string;
  targetFile?: string;
  priority: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  createdAt: Date;
  executedAt?: Date;
  result?: string;
  error?: string;
}

export interface DynamicAgent {
  id: string;
  name: string;
  purpose: string;
  prompt: string;
  tools: string[];
  createdAt: Date;
  executionCount: number;
  successRate: number;
}

export class OpenQABrain extends EventEmitter {
  private db: OpenQADatabase;
  private llm: ResilientLLM;
  private cache = new LLMCache();
  private diffAnalyzer = new DiffAnalyzer();
  private saasConfig: SaaSConfig;
  private generatedTests: Map<string, GeneratedTest> = new Map();
  private dynamicAgents: Map<string, DynamicAgent> = new Map();
  private specialistManager: SpecialistAgentManager | null = null;
  private browserTools: BrowserTools | null = null;
  private githubTools: GitHubTools | null = null;
  private gitlabTools: GitLabTools | null = null;
  private kanbanTools: KanbanTools | null = null;
  private apiHttpTools: ApiHttpTools | null = null;
  private intelligenceAnalyzer: ProjectIntelligenceAnalyzer;
  private proactiveKanban: ProactiveKanbanManager;
  private projectIntelligence: ProjectIntelligence | null = null;
  private sessionId: string = '';
  private workDir: string = './data/workspace';
  private testsDir: string = './data/generated-tests';

  constructor(
    db: OpenQADatabase,
    llmConfig: { provider: string; apiKey: string; model?: string; specialistModel?: string; fallbackProvider?: string; fallbackApiKey?: string; fallbackModel?: string },
    saasConfig: SaaSConfig,
    sessionId?: string,
    githubConfig?: { token?: string; owner?: string; repo?: string }
  ) {
    super();
    this.db = db;
    this.saasConfig = saasConfig;
    this.sessionId = sessionId || `session_${Date.now()}`;

    this.llm = new ResilientLLM({
      provider: llmConfig.provider,
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      fallbackProvider: llmConfig.fallbackProvider,
      fallbackApiKey: llmConfig.fallbackApiKey,
      fallbackModel: llmConfig.fallbackModel,
    });

    // Forward LLM resilience events
    for (const event of ['llm-retry', 'llm-fallback', 'llm-circuit-open', 'llm-circuit-half-open', 'llm-primary-failed']) {
      this.llm.on(event, (data) => this.emit(event, data));
    }

    mkdirSync(this.workDir, { recursive: true });
    mkdirSync(this.testsDir, { recursive: true });

    // Initialize all tools
    this.intelligenceAnalyzer = new ProjectIntelligenceAnalyzer();
    this.proactiveKanban = new ProactiveKanbanManager(this.db);

    this.browserTools = new BrowserTools(this.db, this.sessionId);
    this.githubTools  = new GitHubTools(this.db, this.sessionId, githubConfig || {});
    this.kanbanTools  = new KanbanTools(this.db, this.sessionId);
    this.apiHttpTools = new ApiHttpTools(this.db, this.sessionId, saasConfig.url);

    // GitLab mode: build GitLabTools when the target URL is a GitLab repo
    const isGitLabUrl = saasConfig.url.startsWith('https://gitlab.com/')
      || saasConfig.url.startsWith('http://gitlab.com/')
      || saasConfig.url.includes('/gitlab/');
    if (isGitLabUrl || saasConfig.gitlabToken) {
      const urlObj      = new URL(saasConfig.url.startsWith('http') ? saasConfig.url : `https://${saasConfig.url}`);
      const projectPath = urlObj.pathname.replace(/^\//, '').replace(/\.git$/, '');
      this.gitlabTools  = new GitLabTools(this.db, this.sessionId, {
        token:   saasConfig.gitlabToken,
        project: projectPath,
        url:     saasConfig.gitlabUrl || urlObj.origin,
      });
    }

    // Specialists receive GitHub tools OR GitLab tools — whichever is active.
    // GitLabTools exposes the same tool names as GitHubTools so prompts stay unchanged.
    const repoTools = this.gitlabTools ?? this.githubTools;

    // Initialize specialist manager — pass specialistModel so they use a cheap/fast
    // model (gpt-4o-mini / claude-haiku) while the brain keeps the full model.
    this.specialistManager = new SpecialistAgentManager(
      this.db,
      this.sessionId,
      {
        provider: llmConfig.provider,
        apiKey: llmConfig.apiKey,
        model: llmConfig.model,
        specialistModel: llmConfig.specialistModel,
      },
      this.browserTools,
      repoTools,
      this.kanbanTools,
      this.apiHttpTools
    );

    // Forward specialist events
    this.specialistManager.on('agent-created', (status: AgentStatus) => {
      logger.info('Specialist agent created', { type: status.type, id: status.id });
      this.emit('specialist-created', status);
    });
    this.specialistManager.on('agent-started', (status: AgentStatus) => {
      logger.info('Specialist agent started', { type: status.type, id: status.id });
      this.emit('specialist-started', status);
    });
    this.specialistManager.on('agent-completed', (data: AgentStatus & { result?: string }) => {
      logger.info('Specialist agent completed', { type: data.type, id: data.id, findings: data.findings });
      this.emit('specialist-completed', data);
    });
    this.specialistManager.on('agent-failed', (data: AgentStatus & { error?: string }) => {
      logger.error('Specialist agent failed', { type: data.type, id: data.id, error: data.error });
      this.emit('specialist-failed', data);
    });
  }

  async analyze(): Promise<{
    understanding: string;
    suggestedTests: string[];
    suggestedAgents: string[];
    risks: string[];
  }> {
    let codeContext = '';
    if (this.saasConfig.repoUrl || this.saasConfig.localPath) {
      codeContext = await this.analyzeCodebase();
    }

    const prompt = `You are OpenQA Brain, an autonomous QA system that thinks like a senior QA engineer.

## SaaS Application to Test
- **Name**: ${this.saasConfig.name}
- **Description**: ${this.saasConfig.description}
- **URL**: ${this.saasConfig.url}
- **Tech Stack**: ${this.saasConfig.techStack?.join(', ') || 'Unknown'}
- **Auth Type**: ${this.saasConfig.authInfo?.type || 'none'}

## User Directives
${this.saasConfig.directives?.map(d => `- ${d}`).join('\n') || 'None specified'}

${codeContext ? `## Code Analysis\n${codeContext}` : ''}

## Your Task
Analyze this application and provide:

1. **Understanding**: A brief summary of what this application does and its critical paths
2. **Suggested Tests**: List specific tests you would create (be concrete, not generic)
3. **Suggested Agents**: Custom agents you would create for this specific app
4. **Risks**: Potential issues or vulnerabilities to focus on

Think deeply about what could go wrong with THIS specific application.

Respond in JSON format:
{
  "understanding": "...",
  "suggestedTests": ["Test 1: ...", "Test 2: ..."],
  "suggestedAgents": ["Agent for X", "Agent for Y"],
  "risks": ["Risk 1", "Risk 2"]
}`;

    const cached = this.cache.get(prompt);
    const response = cached ?? await this.llm.generate(prompt);
    if (!cached) this.cache.set(prompt, response);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e: unknown) {
      logger.warn('Failed to parse analysis', { error: e instanceof Error ? e.message : String(e) });
    }

    return {
      understanding: response,
      suggestedTests: [],
      suggestedAgents: [],
      risks: []
    };
  }

  private async analyzeCodebase(): Promise<string> {
    let repoPath = this.saasConfig.localPath;

    if (this.saasConfig.repoUrl && !this.saasConfig.localPath) {
      repoPath = join(this.workDir, 'repo');
      
      if (!existsSync(repoPath)) {
        logger.info('Cloning repository', { url: this.saasConfig.repoUrl });
        try {
          execSync(`git clone --depth 1 ${this.saasConfig.repoUrl} ${repoPath}`, {
            stdio: 'pipe'
          });
        } catch (e) {
          logger.error('Failed to clone repository', { error: e instanceof Error ? e.message : String(e) });
          return '';
        }
      }
    }

    if (!repoPath || !existsSync(repoPath)) {
      return '';
    }

    const analysis: string[] = [];

    try {
      const packageJsonPath = join(repoPath, 'package.json');
      if (existsSync(packageJsonPath)) {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        analysis.push(`### Package Info`);
        analysis.push(`- Name: ${pkg.name}`);
        analysis.push(`- Dependencies: ${Object.keys(pkg.dependencies || {}).slice(0, 20).join(', ')}`);
        analysis.push(`- Scripts: ${Object.keys(pkg.scripts || {}).join(', ')}`);
      }

      const srcFiles = this.findFiles(repoPath, ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'], 50);
      if (srcFiles.length > 0) {
        analysis.push(`\n### Source Files (${srcFiles.length} found)`);
        srcFiles.slice(0, 20).forEach(f => {
          analysis.push(`- ${f.replace(repoPath, '')}`);
        });
      }

      const testFiles = this.findFiles(repoPath, ['.test.ts', '.test.js', '.spec.ts', '.spec.js'], 20);
      if (testFiles.length > 0) {
        analysis.push(`\n### Existing Tests (${testFiles.length} found)`);
        testFiles.slice(0, 10).forEach(f => {
          analysis.push(`- ${f.replace(repoPath, '')}`);
        });
      }

      const routePatterns = ['routes', 'pages', 'views', 'controllers', 'api'];
      for (const pattern of routePatterns) {
        const routeDir = join(repoPath, 'src', pattern);
        if (existsSync(routeDir)) {
          const routes = this.findFiles(routeDir, ['.ts', '.tsx', '.js', '.jsx'], 20);
          if (routes.length > 0) {
            analysis.push(`\n### Routes/Pages`);
            routes.forEach(f => {
              analysis.push(`- ${f.replace(repoPath, '')}`);
            });
          }
          break;
        }
      }

    } catch (e) {
      logger.error('Error analyzing codebase', { error: e instanceof Error ? e.message : String(e) });
    }

    return analysis.join('\n');
  }

  private findFiles(dir: string, extensions: string[], limit: number): string[] {
    const results: string[] = [];
    
    try {
      const find = (d: string) => {
        if (results.length >= limit) return;
        
        const { readdirSync, statSync } = require('fs');
        const items = readdirSync(d);
        
        for (const item of items) {
          if (results.length >= limit) return;
          if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') continue;
          
          const fullPath = join(d, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            find(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            results.push(fullPath);
          }
        }
      };
      
      find(dir);
    } catch (e) {
    }
    
    return results;
  }

  async generateTest(
    type: GeneratedTest['type'],
    target: string,
    context?: string
  ): Promise<GeneratedTest> {
    const prompt = `You are OpenQA, an autonomous QA engineer. Generate a ${type} test.

## Application
- **Name**: ${this.saasConfig.name}
- **Description**: ${this.saasConfig.description}
- **URL**: ${this.saasConfig.url}

## Test Target
${target}

${context ? `## Additional Context\n${context}` : ''}

## Instructions
Generate a complete, runnable test. Use Playwright for E2E/functional tests.

For ${type} tests:
${type === 'unit' ? '- Test isolated functions/components\n- Mock dependencies\n- Use Jest or Vitest syntax' : ''}
${type === 'functional' ? '- Test user workflows\n- Use Playwright\n- Include assertions' : ''}
${type === 'e2e' ? '- Test complete user journeys\n- Use Playwright\n- Handle auth if needed' : ''}
${type === 'regression' ? '- Test previously broken functionality\n- Verify bug fixes\n- Include edge cases' : ''}
${type === 'security' ? '- Test for vulnerabilities\n- SQL injection, XSS, auth bypass\n- Use safe payloads' : ''}
${type === 'performance' ? '- Measure load times\n- Check resource usage\n- Set thresholds' : ''}

Respond with JSON:
{
  "name": "descriptive test name",
  "description": "what this test verifies",
  "code": "// complete test code here",
  "priority": 1-5
}`;

    const cached2 = this.cache.get(prompt);
    const response = cached2 ?? await this.llm.generate(prompt);
    if (!cached2) this.cache.set(prompt, response);

    let testData = { name: target, description: '', code: '', priority: 3 };
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        testData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      testData.code = response;
    }

    const test: GeneratedTest = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: testData.name,
      type,
      description: testData.description,
      code: testData.code,
      priority: testData.priority,
      status: 'pending',
      createdAt: new Date()
    };

    this.generatedTests.set(test.id, test);
    this.saveTest(test);
    
    this.emit('test-generated', test);
    
    return test;
  }

  private saveTest(test: GeneratedTest) {
    const filename = `${test.type}_${test.id}.ts`;
    const filepath = join(this.testsDir, filename);
    
    const content = `/**
 * Generated by OpenQA
 * Type: ${test.type}
 * Name: ${test.name}
 * Description: ${test.description}
 * Created: ${test.createdAt.toISOString()}
 */

${test.code}
`;
    
    writeFileSync(filepath, content);
    test.targetFile = filepath;
  }

  async createDynamicAgent(purpose: string): Promise<DynamicAgent> {
    const prompt = `You are OpenQA Brain. Create a specialized testing agent.

## Application Context
- **Name**: ${this.saasConfig.name}
- **Description**: ${this.saasConfig.description}
- **URL**: ${this.saasConfig.url}

## Agent Purpose
${purpose}

## Instructions
Design a specialized agent for this specific purpose. The agent should:
1. Have a clear, focused mission
2. Know exactly what to test
3. Know how to report findings

Respond with JSON:
{
  "name": "Agent Name",
  "purpose": "Clear purpose statement",
  "prompt": "Complete system prompt for this agent (be specific and detailed)",
  "tools": ["tool1", "tool2"] // from: navigate, click, fill, screenshot, check_console, create_issue, create_ticket
}`;

    const cached3 = this.cache.get(prompt);
    const response = cached3 ?? await this.llm.generate(prompt);
    if (!cached3) this.cache.set(prompt, response);

    let agentData: { name: string; purpose: string; prompt: string; tools: string[] } = { name: purpose, purpose, prompt: '', tools: [] };

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        agentData = JSON.parse(jsonMatch[0]);
      }
    } catch (_e: unknown) {
      agentData.prompt = response;
    }

    const agent: DynamicAgent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: agentData.name,
      purpose: agentData.purpose,
      prompt: agentData.prompt,
      tools: agentData.tools,
      createdAt: new Date(),
      executionCount: 0,
      successRate: 0
    };

    this.dynamicAgents.set(agent.id, agent);
    
    this.emit('agent-created', agent);
    
    return agent;
  }

  async executeTest(testId: string): Promise<GeneratedTest> {
    const test = this.generatedTests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    test.status = 'running';
    test.executedAt = new Date();
    this.emit('test-started', test);

    try {
      if (!test.targetFile || !existsSync(test.targetFile)) {
        test.status = 'skipped';
        test.result = 'Test file not found — code was generated but not saved to disk.';
        this.emit('test-completed', test);
        return test;
      }

      // Actually run the generated TypeScript test file via tsx
      const { stdout, stderr } = await execAsync(
        `npx tsx "${test.targetFile}"`,
        { timeout: 60_000, cwd: process.cwd() }
      );

      await this.db.createAction({
        session_id: this.sessionId,
        type: 'test_execution',
        description: `Ran test: ${test.name}`,
        input: JSON.stringify({ testId, file: test.targetFile }),
        output: stdout.slice(0, 2000) || '(no output)',
      });

      const hasFailed = stderr.toLowerCase().includes('error') ||
                        stdout.toLowerCase().includes('failed') ||
                        stdout.toLowerCase().includes('✗');

      test.status = hasFailed ? 'failed' : 'passed';
      test.result = stdout.slice(0, 2000) || 'Test passed with no output.';
      if (stderr) test.error = stderr.slice(0, 500);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Exit code ≠ 0 means test assertions failed — that is expected and useful
      if (msg.includes('Command failed')) {
        test.status = 'failed';
        test.result = msg.slice(0, 2000);
      } else {
        test.status = 'failed';
        test.error = msg;
      }
    }

    this.emit('test-completed', test);
    return test;
  }

  async think(iteration: number = 0, maxIterations: number = 10): Promise<{
    decision: string;
    actions: Array<{ type: string; target: string; reason: string }>;  }> {
    const recentTests = Array.from(this.generatedTests.values()).slice(-10);
    const recentAgents = Array.from(this.dynamicAgents.values()).slice(-5);
    const timestamp = Date.now();

    const prompt = `You are OpenQA Brain, an autonomous QA system. Think about what to do next.

## Application
- **Name**: ${this.saasConfig.name}
- **Description**: ${this.saasConfig.description}
- **URL**: ${this.saasConfig.url}

## User Directives
${this.saasConfig.directives?.map(d => `- ${d}`).join('\n') || 'None'}

## Current Progress
- Iteration: ${iteration + 1}/${maxIterations}
- Timestamp: ${timestamp}
- Tests Generated: ${this.generatedTests.size}
- Agents Created: ${this.dynamicAgents.size}

## Recent Tests (${recentTests.length})
${recentTests.map(t => `- [${t.status}] ${t.type}: ${t.name}`).join('\n') || 'None yet'}

## Active Agents (${recentAgents.length})
${recentAgents.map(a => `- ${a.name}: ${a.purpose}`).join('\n') || 'None yet'}

## Your Task
Decide what to do next. You MUST provide at least 1-2 actions unless you have completed comprehensive testing.

Consider:
1. What areas haven't been tested yet?
2. Are there any failed tests that need investigation?
3. Should you create new specialized agents?
4. What tests would be most valuable right now?
5. Have you tested: functional flows, security, performance, usability?

**IMPORTANT**: If this is early in testing (iteration < 5), you should be creating agents and generating tests actively.

Respond with JSON:
{
  "decision": "Brief explanation of your reasoning",
  "actions": [
    { "type": "generate_test", "target": "what to test", "reason": "why" },
    { "type": "create_agent", "target": "agent purpose", "reason": "why" },
    { "type": "run_test", "target": "test_id", "reason": "why" },
    { "type": "analyze", "target": "what to analyze", "reason": "why" }
  ]
}`;

    // DON'T cache think() calls - we want fresh decisions each time
    const response = await this.llm.generate(prompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
    }

    return {
      decision: response,
      actions: []
    };
  }

  async runAutonomously(maxIterations: number = 10): Promise<void> {
    const log = logger.child({ app: this.saasConfig.name });
    log.info('Brain starting autonomous mode', { maxIterations });

    // Clear stale specialist statuses from any previous session so the dashboard
    // Specialists panel always reflects the CURRENT run only.
    this.specialistManager?.reset();

    // Detect provider mode up front — used in Phase 0 and Phase 2
    const isGithubMode = this.saasConfig.url.startsWith('https://github.com/') ||
                         this.saasConfig.url.startsWith('http://github.com/');
    const isGitlabMode = !isGithubMode && (
      this.saasConfig.url.startsWith('https://gitlab.com/') ||
      this.saasConfig.url.startsWith('http://gitlab.com/') ||
      // self-hosted GitLab: url contains /gitlab/ or was configured with gitlab.url
      this.saasConfig.url.includes('/gitlab/')
    );

    const MANIFEST_FILES = [
      'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
      'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts',
      'Gemfile', 'composer.json', 'mix.exs', 'setup.py',
      'openapi.json', 'openapi.yaml', 'swagger.json', 'swagger.yaml',
    ];

    // ── Phase 0: Project Intelligence (runs BEFORE any testing) ─────────────
    log.info('Running project intelligence analysis…');
    try {
      let fileContents: Record<string, string> = {};

      // GitHub mode: pre-fetch manifest files via GitHub API (free, no LLM)
      if (isGithubMode && this.githubTools) {
        const tools = this.githubTools.getTools();
        const getFileTool = tools.find(t => t.name === 'get_file_content');
        if (getFileTool) {
          const fetches = MANIFEST_FILES.map(async (path) => {
            try {
              const result = await (getFileTool as { execute: (args: { path: string }) => Promise<{ output: string }> }).execute({ path });
              if (result.output && !result.output.startsWith('Failed')) {
                fileContents[path] = result.output;
              }
            } catch { /* file doesn't exist in this repo — skip */ }
          });
          await Promise.all(fetches);
          log.info('GitHub manifest files fetched', { count: Object.keys(fileContents).length, files: Object.keys(fileContents) });
        }
      }

      // GitLab mode: pre-fetch manifest files via GitLab REST API (free, no LLM)
      if (isGitlabMode) {
        // Extract project path from URL: https://gitlab.com/owner/repo → owner/repo
        const urlObj = new URL(this.saasConfig.url);
        const projectPath = urlObj.pathname.replace(/^\//, '').replace(/\.git$/, '');
        // Use explicit gitlabUrl if set (self-hosted), fallback to URL origin
        const gitlabBase  = this.saasConfig.gitlabUrl || urlObj.origin;
        const encoded     = encodeURIComponent(projectPath);
        const gitlabToken = this.saasConfig.gitlabToken;
        const headers: Record<string, string> = { 'User-Agent': 'OpenQA/3.0' };
        if (gitlabToken) headers['PRIVATE-TOKEN'] = gitlabToken;

        const fetches = MANIFEST_FILES.map(async (filePath) => {
          try {
            const encodedFile = encodeURIComponent(filePath);
            const apiUrl = `${gitlabBase}/api/v4/projects/${encoded}/repository/files/${encodedFile}/raw?ref=HEAD`;
            const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const text = await res.text();
              if (text) fileContents[filePath] = text;
            }
          } catch { /* file doesn't exist or unreachable — skip */ }
        });
        await Promise.all(fetches);
        log.info('GitLab manifest files fetched', { count: Object.keys(fileContents).length, files: Object.keys(fileContents) });
      }

      this.projectIntelligence = await this.intelligenceAnalyzer.analyze(
        this.saasConfig.url,
        {
          repoUrl: this.saasConfig.repoUrl,
          repoPath: this.saasConfig.localPath,
          appName: this.saasConfig.name,
          appDescription: this.saasConfig.description,
          // LLM fallback: only called when static confidence is low (~150 tokens)
          llmFn: (prompt: string) => this.llm.generate(prompt),
          // Pre-fetched manifest files for backend detection (free, no LLM)
          fileContents: Object.keys(fileContents).length > 0 ? fileContents : undefined,
        },
      );

      const bp = this.projectIntelligence.backendProfile;
      log.info('Intelligence analysis complete', {
        domain: this.projectIntelligence.domain,
        riskLevel: this.projectIntelligence.riskLevel,
        projectType: bp.projectType,
        language: bp.language,
        framework: bp.framework,
        mandatoryChecks: this.projectIntelligence.mandatoryChecks.length,
      });
      this.emit('intelligence-complete', this.projectIntelligence);

      // Seed Kanban with strategic tasks derived from the intelligence report
      const seeded = await this.proactiveKanban.seedFromIntelligence(this.projectIntelligence);
      log.info('Kanban seeded from intelligence', { ticketsCreated: seeded.length });
      this.emit('kanban-seeded', { count: seeded.length, tickets: seeded });
    } catch (err) {
      log.warn('Intelligence analysis failed — continuing without it', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Phase 1: LLM-powered analysis ────────────────────────────────────────
    // Wrapped in try-catch: LLM failures (rate limit, bad key) must NOT kill the session
    try {
      const analysis = await this.analyze();
      log.info('Analysis complete', { suggestedTests: analysis.suggestedTests.length });
      this.emit('analysis-complete', analysis);
    } catch (err) {
      log.warn('LLM analysis failed — skipping, specialists will still run', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Phase 2: Specialist agents ───────────────────────────────────────────────
    if (this.specialistManager) {
      log.info('Starting specialist agents');

      // Mode already detected above (isGithubMode)

      // Choose specialist types based on mode + backend profile
      let specialistTypes: AgentType[];
      const bp = this.projectIntelligence?.backendProfile;
      const isBackendProject = bp && (bp.projectType === 'backend-only' || bp.projectType === 'fullstack');

      if ((isGithubMode || isGitlabMode) && isBackendProject) {
        // Backend repo detected → backend specialists (HTTP testing + code audit) + repo analysts
        log.info(`${isGithubMode ? 'GitHub' : 'GitLab'} mode + backend project detected`, {
          language: bp!.language, framework: bp!.framework, projectType: bp!.projectType,
        });
        specialistTypes = [
          'backend-api-tester',
          'backend-security-auditor',
          'backend-code-auditor',
          'backend-dependency-scanner',
          'github-issue-analyzer',  // always useful for repo health
        ];
      } else if (isGithubMode || isGitlabMode) {
        // GitHub/GitLab repo but unknown/frontend/library → standard repo specialists
        specialistTypes = ['github-code-reviewer', 'github-security-auditor', 'github-issue-analyzer'];
        log.info(`${isGithubMode ? 'GitHub' : 'GitLab'} mode (non-backend) — using repo specialists`, { url: this.saasConfig.url });
      } else if (this.projectIntelligence) {
        // Intelligence-guided SaaS specialists (max 4 to keep TPM in budget)
        specialistTypes = (this.projectIntelligence.suggestedSpecialists as AgentType[]).slice(0, 4);
      } else {
        // Default SaaS specialists
        specialistTypes = ['form-tester', 'security-scanner', 'component-tester', 'performance-tester'];
      }

      // Create specialist agents
      const agentIds = specialistTypes.map(type => {
        const id = this.specialistManager!.createSpecialist(type);
        log.info('Created specialist', { type, id });
        return { id, type };
      });

      // Add dynamic agents from intelligence blueprints (max 2 extra, only in SaaS mode)
      if (!isGithubMode && !isGitlabMode && this.projectIntelligence?.dynamicAgentBlueprints.length) {
        for (const blueprint of this.projectIntelligence.dynamicAgentBlueprints.slice(0, 2)) {
          const id = this.specialistManager!.createDynamicSpecialist(blueprint);
          log.info('Created dynamic agent from blueprint', { name: blueprint.name, id });
          agentIds.push({ id, type: `dynamic:${blueprint.name}` as AgentType });
        }
      }

      // Move Kanban tickets to "in-progress" when a specialist starts,
      // and to "done" / "to-do" when it completes / fails.
      this.specialistManager!.on('agent-started', async (status: AgentStatus) => {
        try {
          await this.proactiveKanban.syncWithSpecialistResults([
            { type: status.type, status: 'running' }
          ]);
          // Find tickets matching this specialist and move to in-progress
          const tickets = await this.db.getKanbanTickets();
          // (syncWithSpecialistResults skips 'running' status intentionally — handle in-progress here)
          const tagMap: Record<string, string[]> = {
            'security-scanner': ['security'], 'github-security-auditor': ['security'],
            'accessibility-tester': ['accessibility', 'wcag'],
            'performance-tester': ['performance'],
            'form-tester': ['forms'], 'component-tester': ['ui', 'improvement'],
            'api-tester': ['api'], 'github-code-reviewer': ['tech-debt', 'improvement'],
            'github-issue-analyzer': ['strategy'],
          };
          const relevantTags = tagMap[status.type] || [];
          for (const ticket of tickets) {
            if (ticket.column !== 'to-do' && ticket.column !== 'backlog') continue;
            const ticketTags = (ticket.tags || '').split(',').map((t: string) => t.trim().toLowerCase());
            if (relevantTags.some(tag => ticketTags.includes(tag))) {
              await this.db.updateKanbanTicket(ticket.id, { column: 'in-progress' });
            }
          }
        } catch { /* non-critical */ }
      });

      this.specialistManager!.on('agent-completed', async (data: AgentStatus) => {
        try {
          await this.proactiveKanban.syncWithSpecialistResults([
            { type: data.type, status: 'completed' }
          ]);
        } catch { /* non-critical */ }
      });

      this.specialistManager!.on('agent-failed', async (data: AgentStatus) => {
        try {
          await this.proactiveKanban.syncWithSpecialistResults([
            { type: data.type, status: 'failed' }
          ]);
        } catch { /* non-critical */ }
      });

      // ── Concurrent specialist runner with a pool of max 2 at once ────────────
      // gpt-4o-mini (specialists) has 200k TPM — we can safely run 2 in parallel.
      // GitHub mode uses 1 at a time (API rate limits are per-IP, not per-model).
      const CONCURRENCY = (isGithubMode || isGitlabMode) ? 1 : 2;

      const runSpecialistSuite = async () => {
        const queue = [...agentIds];
        const running = new Set<Promise<void>>();

        const startNext = (): Promise<void> | undefined => {
          const item = queue.shift();
          if (!item) return undefined;

          const { id, type } = item;
          const p: Promise<void> = (async () => {
            try {
              await this.specialistManager!.runSpecialist(id, this.saasConfig.url);
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              log.error('Specialist failed', { type, error: errMsg });
              if (errMsg.includes('rate_limit_exceeded') || errMsg.includes('429')) {
                log.warn('Rate limit hit — pausing 30s before next slot opens');
                await new Promise(r => setTimeout(r, 30_000));
              }
            }
          })().finally(() => {
            running.delete(p);
            // Fill the freed slot immediately
            const next = startNext();
            if (next) running.add(next);
          });

          return p;
        };

        // Fill up to CONCURRENCY slots immediately
        for (let i = 0; i < Math.min(CONCURRENCY, queue.length + 1); i++) {
          const p = startNext();
          if (p) running.add(p);
        }

        // Wait until every specialist has finished
        while (running.size > 0) {
          await Promise.race(running);
        }
      };

      log.info('Specialist agents queued', { count: agentIds.length, mode: isGithubMode ? 'github' : isGitlabMode ? 'gitlab' : 'saas' });

      if (isGithubMode || isGitlabMode) {
        // ── Repository mode (GitHub / GitLab): run specialists serially ─────────
        // The think() loop is useless here — the LLM cannot browse a repo URL.
        // Awaiting the suite directly also surfaces errors properly.
        log.info(`${isGithubMode ? 'GitHub' : 'GitLab'} mode — awaiting specialist suite (no think loop)`);
        await runSpecialistSuite().catch(err =>
          log.error('Specialist suite failed', { error: err instanceof Error ? err.message : String(err) })
        );
      } else {
        // ── SaaS mode: run specialists concurrently with think() loop ──────────
        runSpecialistSuite().catch(err =>
          log.error('Specialist suite failed', { error: err instanceof Error ? err.message : String(err) })
        );

        for (let i = 0; i < maxIterations; i++) {
          log.info('Iteration', { iteration: i + 1, maxIterations });

          let thought: { decision: string; actions: Array<{ type: string; target: string; reason: string }> };
          try {
            thought = await this.think(i, maxIterations);
          } catch (e: unknown) {
            log.warn('think() failed — skipping iteration', { error: e instanceof Error ? e.message : String(e) });
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          log.info('Decision', { decision: thought.decision, actionCount: thought.actions.length });
          this.emit('thinking', thought);

          for (const action of thought.actions) {
            log.info('Action', { type: action.type, target: action.target, reason: action.reason });
            try {
              switch (action.type) {
                case 'generate_test': {
                  const testType = this.inferTestType(action.target);
                  await this.generateTest(testType, action.target, action.reason);
                  break;
                }
                case 'create_agent':
                  await this.createDynamicAgent(action.target);
                  break;
                case 'run_test':
                  if (this.generatedTests.has(action.target)) {
                    await this.executeTest(action.target);
                  }
                  break;
                case 'analyze':
                  break;
              }
            } catch (e: unknown) {
              log.error('Action failed', { type: action.type, error: e instanceof Error ? e.message : String(e) });
            }
          }

          if (thought.actions.length === 0) {
            log.info('No actions returned — testing appears complete', { iteration: i + 1 });
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    log.info('Autonomous session complete');
    this.emit('session-complete', {
      testsGenerated: this.generatedTests.size,
      agentsCreated: this.dynamicAgents.size
    });
  }

  private inferTestType(target: string): GeneratedTest['type'] {
    const lower = target.toLowerCase();
    if (lower.includes('security') || lower.includes('injection') || lower.includes('xss')) return 'security';
    if (lower.includes('performance') || lower.includes('load') || lower.includes('speed')) return 'performance';
    if (lower.includes('regression') || lower.includes('bug') || lower.includes('fix')) return 'regression';
    if (lower.includes('unit') || lower.includes('function') || lower.includes('component')) return 'unit';
    if (lower.includes('e2e') || lower.includes('journey') || lower.includes('flow')) return 'e2e';
    return 'functional';
  }

  getGeneratedTests(): GeneratedTest[] {
    return Array.from(this.generatedTests.values());
  }

  getDynamicAgents(): DynamicAgent[] {
    return Array.from(this.dynamicAgents.values());
  }

  getStats() {
    const tests = this.getGeneratedTests();
    return {
      totalTests: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      pending: tests.filter(t => t.status === 'pending').length,
      agents: this.dynamicAgents.size,
      specialists: this.specialistManager?.getAllStatuses() || [],
      byType: {
        unit: tests.filter(t => t.type === 'unit').length,
        functional: tests.filter(t => t.type === 'functional').length,
        e2e: tests.filter(t => t.type === 'e2e').length,
        regression: tests.filter(t => t.type === 'regression').length,
        security: tests.filter(t => t.type === 'security').length,
        performance: tests.filter(t => t.type === 'performance').length
      }
    };
  }

  getSpecialistStatuses(): AgentStatus[] {
    return this.specialistManager?.getAllStatuses() || [];
  }

  /**
   * B8 — Incremental mode: only generate tests for files changed vs baseBranch.
   * Emits 'diff-analyzed' with the DiffResult, then runs autonomously with a reduced
   * scope derived from the changed files.
   */
  async runIncrementally(baseBranch: string = 'main'): Promise<void> {
    const repoPath = this.saasConfig.localPath;
    if (!repoPath) {
      logger.warn('runIncrementally: no localPath configured, falling back to full run');
      return this.runAutonomously();
    }

    const diff = this.diffAnalyzer.analyze(repoPath, baseBranch);
    logger.info('Incremental diff', { changedFiles: diff.changedFiles.length, affectedTests: diff.affectedTests.length, riskLevel: diff.riskLevel });
    this.emit('diff-analyzed', diff);

    if (diff.changedFiles.length === 0) {
      logger.info('No changed files — skipping incremental run');
      this.emit('session-complete', { testsGenerated: 0, agentsCreated: 0, incremental: true });
      return;
    }

    // Generate targeted tests for each changed file
    for (const file of diff.changedFiles.slice(0, 10)) {
      const testType = this.inferTestType(file);
      const context = `Changed file: ${file}\nRisk level: ${diff.riskLevel}\n${diff.summary}`;
      try {
        await this.generateTest(testType, `Test coverage for ${file}`, context);
      } catch (e: unknown) {
        logger.error('Failed to generate test for file', { file, error: e instanceof Error ? e.message : String(e) });
      }
    }

    this.emit('session-complete', {
      testsGenerated: this.generatedTests.size,
      agentsCreated: this.dynamicAgents.size,
      incremental: true,
      diff,
    });
  }
}
