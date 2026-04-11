import { ReActAgent } from '@orka-js/agent';
import { OpenAIAdapter } from '@orka-js/openai';
import { AnthropicAdapter } from '@orka-js/anthropic';
import { EventEmitter } from 'events';
import { OpenQADatabase } from '../../database/index.js';
import { BrowserTools } from '../tools/browser.js';

export type AgentType = 
  | 'form-tester'
  | 'security-scanner'
  | 'sql-injection'
  | 'xss-tester'
  | 'component-tester'
  | 'accessibility-tester'
  | 'performance-tester'
  | 'api-tester'
  | 'auth-tester'
  | 'navigation-tester';

export interface AgentStatus {
  id: string;
  type: AgentType;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentTask?: string;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  findings: number;
  actions: number;
}

export interface SpecialistConfig {
  type: AgentType;
  enabled: boolean;
  priority: number;
  maxIterations: number;
  customPrompt?: string;
}

const SPECIALIST_PROMPTS: Record<AgentType, string> = {
  'form-tester': `You are a Form Testing Specialist. Your mission:
- Find all forms on the page (login, signup, contact, search, etc.)
- Test form validation (empty fields, invalid formats, boundary values)
- Test error messages and user feedback
- Test form submission success/failure scenarios
- Check for proper field types (email, password, phone)
- Test autofill behavior
- Report any form-related bugs with clear reproduction steps`,

  'security-scanner': `You are a Security Scanner Specialist. Your mission:
- Identify potential security vulnerabilities
- Check for exposed sensitive data in page source
- Look for insecure HTTP resources on HTTPS pages
- Check for missing security headers
- Identify potential CSRF vulnerabilities
- Check for information disclosure in error messages
- Look for hardcoded credentials or API keys
- Report security issues with severity ratings`,

  'sql-injection': `You are a SQL Injection Testing Specialist. Your mission:
- Identify input fields that might interact with databases
- Test common SQL injection payloads (', ", --, ;, OR 1=1, etc.)
- Test for blind SQL injection (time-based, boolean-based)
- Check URL parameters for injection vulnerabilities
- Test search fields, login forms, and filters
- Document any successful injections with exact payloads
- Rate severity based on data exposure risk`,

  'xss-tester': `You are an XSS (Cross-Site Scripting) Testing Specialist. Your mission:
- Find all user input fields that reflect content
- Test for reflected XSS (<script>, onerror, onload, etc.)
- Test for stored XSS in comments, profiles, messages
- Check for DOM-based XSS vulnerabilities
- Test various encoding bypasses
- Check if Content-Security-Policy is properly configured
- Document successful XSS with exact payloads`,

  'component-tester': `You are a UI Component Testing Specialist. Your mission:
- Test all interactive components (buttons, dropdowns, modals, tabs)
- Verify component states (hover, active, disabled, loading)
- Test responsive behavior at different viewport sizes
- Check for broken layouts or overlapping elements
- Test keyboard navigation and focus management
- Verify animations and transitions work correctly
- Report visual bugs with screenshots`,

  'accessibility-tester': `You are an Accessibility Testing Specialist. Your mission:
- Check for proper ARIA labels and roles
- Verify keyboard navigation works for all interactive elements
- Check color contrast ratios
- Verify images have alt text
- Test screen reader compatibility
- Check for proper heading hierarchy
- Verify focus indicators are visible
- Report WCAG violations with severity`,

  'performance-tester': `You are a Performance Testing Specialist. Your mission:
- Measure page load times
- Identify slow-loading resources
- Check for render-blocking resources
- Monitor network requests and response times
- Identify memory leaks or excessive DOM nodes
- Check for unnecessary re-renders
- Test under simulated slow network conditions
- Report performance issues with metrics`,

  'api-tester': `You are an API Testing Specialist. Your mission:
- Monitor network requests made by the application
- Test API error handling
- Check for proper authentication on API calls
- Verify API response formats
- Test rate limiting behavior
- Check for exposed internal APIs
- Verify proper HTTP methods are used
- Report API issues with request/response details`,

  'auth-tester': `You are an Authentication Testing Specialist. Your mission:
- Test login with valid/invalid credentials
- Test password reset flow
- Check session management (timeout, persistence)
- Test logout functionality
- Check for session fixation vulnerabilities
- Test remember me functionality
- Verify proper access control on protected pages
- Test multi-factor authentication if present`,

  'navigation-tester': `You are a Navigation Testing Specialist. Your mission:
- Test all navigation links and menus
- Verify breadcrumbs work correctly
- Test browser back/forward behavior
- Check for broken links (404s)
- Test deep linking and URL sharing
- Verify redirects work properly
- Test pagination and infinite scroll
- Report navigation issues with affected URLs`
};

export class SpecialistAgentManager extends EventEmitter {
  private agents: Map<string, ReActAgent> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private db: OpenQADatabase;
  private sessionId: string;
  private llmConfig: { provider: string; apiKey: string; model?: string };
  private browserTools: BrowserTools;

  constructor(
    db: OpenQADatabase,
    sessionId: string,
    llmConfig: { provider: string; apiKey: string; model?: string },
    browserTools: BrowserTools
  ) {
    super();
    this.db = db;
    this.sessionId = sessionId;
    this.llmConfig = llmConfig;
    this.browserTools = browserTools;
  }

  private createLLMAdapter() {
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

  createSpecialist(type: AgentType, customPrompt?: string): string {
    const agentId = `${type}_${Date.now()}`;
    
    const systemPrompt = customPrompt || SPECIALIST_PROMPTS[type];
    
    const llm = this.createLLMAdapter();
    const agent = new ReActAgent({
      tools: this.browserTools.getTools(),
      maxIterations: 15,
      systemPrompt: `${systemPrompt}

IMPORTANT RULES:
- Take screenshots as evidence for any bug found
- Create Kanban tickets for all findings
- Create GitHub issues for critical/high severity bugs
- Be thorough but efficient
- Stop when you've tested the main scenarios for your specialty`
    }, llm);

    this.agents.set(agentId, agent);
    
    const status: AgentStatus = {
      id: agentId,
      type,
      status: 'idle',
      progress: 0,
      findings: 0,
      actions: 0
    };
    this.agentStatuses.set(agentId, status);

    this.emit('agent-created', status);
    
    return agentId;
  }

  async runSpecialist(agentId: string, targetUrl: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const status = this.agentStatuses.get(agentId);
    
    if (!agent || !status) {
      throw new Error(`Agent ${agentId} not found`);
    }

    status.status = 'running';
    status.startedAt = new Date();
    status.progress = 0;
    this.emit('agent-started', status);

    try {
      const result = await agent.run(
        `Test the application at ${targetUrl}. Focus on your specialty area. Report all findings.`
      );

      status.status = 'completed';
      status.completedAt = new Date();
      status.progress = 100;
      
      this.emit('agent-completed', { ...status, result });
      
    } catch (error: unknown) {
      status.status = 'failed';
      status.completedAt = new Date();

      this.emit('agent-failed', { ...status, error: error instanceof Error ? error.message : String(error) });
    }
  }

  async runAllSpecialists(targetUrl: string, types?: AgentType[]): Promise<void> {
    const agentTypes = types || [
      'form-tester',
      'security-scanner',
      'component-tester',
      'navigation-tester'
    ];

    const agentIds = agentTypes.map(type => this.createSpecialist(type));

    for (const agentId of agentIds) {
      await this.runSpecialist(agentId, targetUrl);
    }
  }

  async runSecuritySuite(targetUrl: string): Promise<void> {
    const securityTypes: AgentType[] = [
      'security-scanner',
      'sql-injection',
      'xss-tester',
      'auth-tester'
    ];

    await this.runAllSpecialists(targetUrl, securityTypes);
  }

  getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.agentStatuses.get(agentId);
  }

  getAllStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  stopAgent(agentId: string): void {
    const status = this.agentStatuses.get(agentId);
    if (status && status.status === 'running') {
      status.status = 'failed';
      status.completedAt = new Date();
      this.emit('agent-stopped', status);
    }
  }

  stopAll(): void {
    for (const [agentId] of this.agents) {
      this.stopAgent(agentId);
    }
  }
}
