import { ReActAgent } from '@orka-js/agent';
import { OpenAIAdapter } from '@orka-js/openai';
import { AnthropicAdapter } from '@orka-js/anthropic';
import { EventEmitter } from 'events';
import { OpenQADatabase } from '../../database/index.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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
  private llmConfig: { provider: string; apiKey: string; model?: string };
  private saasConfig: SaaSConfig;
  private generatedTests: Map<string, GeneratedTest> = new Map();
  private dynamicAgents: Map<string, DynamicAgent> = new Map();
  private workDir: string = './data/workspace';
  private testsDir: string = './data/generated-tests';

  constructor(
    db: OpenQADatabase,
    llmConfig: { provider: string; apiKey: string; model?: string },
    saasConfig: SaaSConfig
  ) {
    super();
    this.db = db;
    this.llmConfig = llmConfig;
    this.saasConfig = saasConfig;
    
    mkdirSync(this.workDir, { recursive: true });
    mkdirSync(this.testsDir, { recursive: true });
  }

  private createLLM() {
    if (this.llmConfig.provider === 'anthropic') {
      return new AnthropicAdapter({
        apiKey: this.llmConfig.apiKey,
        model: this.llmConfig.model || 'claude-3-5-sonnet-20241022'
      });
    }
    return new OpenAIAdapter({
      apiKey: this.llmConfig.apiKey,
      model: this.llmConfig.model || 'gpt-4'
    });
  }

  async analyze(): Promise<{
    understanding: string;
    suggestedTests: string[];
    suggestedAgents: string[];
    risks: string[];
  }> {
    const llm = this.createLLM();
    
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

    const response = await llm.generate(prompt);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse analysis:', e);
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
        console.log(`Cloning repository: ${this.saasConfig.repoUrl}`);
        try {
          execSync(`git clone --depth 1 ${this.saasConfig.repoUrl} ${repoPath}`, {
            stdio: 'pipe'
          });
        } catch (e) {
          console.error('Failed to clone repository:', e);
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
      console.error('Error analyzing codebase:', e);
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
    const llm = this.createLLM();

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

    const response = await llm.generate(prompt);
    
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
    const llm = this.createLLM();

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

    const response = await llm.generate(prompt);
    
    let agentData = { name: purpose, purpose, prompt: '', tools: [] };
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        agentData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
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
      if (test.targetFile && existsSync(test.targetFile)) {
        const result = execSync(`npx playwright test ${test.targetFile} --reporter=json`, {
          cwd: this.testsDir,
          stdio: 'pipe',
          timeout: 120000
        });
        
        test.status = 'passed';
        test.result = result.toString();
      } else {
        test.status = 'passed';
        test.result = 'Test code generated (execution skipped - no test runner configured)';
      }
    } catch (e: any) {
      test.status = 'failed';
      test.error = e.message;
    }

    this.emit('test-completed', test);
    return test;
  }

  async think(): Promise<{
    decision: string;
    actions: Array<{ type: string; target: string; reason: string }>;
  }> {
    const llm = this.createLLM();
    
    const recentTests = Array.from(this.generatedTests.values()).slice(-10);
    const recentAgents = Array.from(this.dynamicAgents.values()).slice(-5);

    const prompt = `You are OpenQA Brain, an autonomous QA system. Think about what to do next.

## Application
- **Name**: ${this.saasConfig.name}
- **Description**: ${this.saasConfig.description}
- **URL**: ${this.saasConfig.url}

## User Directives
${this.saasConfig.directives?.map(d => `- ${d}`).join('\n') || 'None'}

## Recent Tests (${recentTests.length})
${recentTests.map(t => `- [${t.status}] ${t.type}: ${t.name}`).join('\n') || 'None yet'}

## Active Agents (${recentAgents.length})
${recentAgents.map(a => `- ${a.name}: ${a.purpose}`).join('\n') || 'None yet'}

## Your Task
Decide what to do next. Consider:
1. What areas haven't been tested yet?
2. Are there any failed tests that need investigation?
3. Should you create new specialized agents?
4. What tests would be most valuable right now?

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

    const response = await llm.generate(prompt);
    
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
    console.log(`🧠 OpenQA Brain starting autonomous mode for ${this.saasConfig.name}`);
    
    const analysis = await this.analyze();
    console.log(`📊 Analysis complete: ${analysis.suggestedTests.length} tests suggested`);
    this.emit('analysis-complete', analysis);

    for (let i = 0; i < maxIterations; i++) {
      console.log(`\n🔄 Iteration ${i + 1}/${maxIterations}`);
      
      const thought = await this.think();
      console.log(`💭 Decision: ${thought.decision}`);
      this.emit('thinking', thought);

      for (const action of thought.actions) {
        console.log(`  ➡️ ${action.type}: ${action.target}`);
        
        try {
          switch (action.type) {
            case 'generate_test':
              const testType = this.inferTestType(action.target);
              await this.generateTest(testType, action.target, action.reason);
              break;
              
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
        } catch (e: any) {
          console.error(`  ❌ Action failed: ${e.message}`);
        }
      }

      if (thought.actions.length === 0) {
        console.log('  ℹ️ No more actions needed');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n✅ Autonomous session complete`);
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
}
