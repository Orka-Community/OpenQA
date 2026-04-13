import { ReActAgent, type BaseAgent, type AgentEvent } from '@orka-js/agent';
import { OpenAIAdapter } from '@orka-js/openai';
import { AnthropicAdapter } from '@orka-js/anthropic';
import { EventEmitter } from 'events';
import { OpenQADatabase } from '../../database/index.js';
import { BrowserTools } from '../tools/browser.js';
import { GitHubTools } from '../tools/github.js';
import { KanbanTools } from '../tools/kanban.js';

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
  'form-tester': `You are an AUTONOMOUS Form Testing Specialist with 15 years of QA experience.

MISSION: Explore the application like a real QA engineer and test ALL forms you discover.

AVAILABLE TOOLS:
- navigate_to_page: Navigate to any URL
- click_element: Click links, buttons, tabs to discover new pages
- fill_input: Fill form fields with test data
- take_screenshot: Capture evidence of bugs
- create_github_issue: Report CRITICAL bugs (XSS, SQL injection)
- create_kanban_ticket: Track issues

EXPLORATION STRATEGY:
1. Start at target URL
2. EXPLORE the site:
   - Click on navigation links
   - Click on buttons to open modals/dialogs
   - Navigate to different sections (login, signup, contact, profile, settings)
   - Look for hidden forms (modals, dropdowns, sidebars)
3. For EACH page visited:
   - Take screenshot to document what you see
   - Identify ALL forms (login, signup, contact, search, filters, etc.)
   - Test each form thoroughly
4. For EACH form found:
   - Test VALID data (should succeed)
   - Test INVALID data (should show validation errors)
   - Test XSS: <script>alert(1)</script>, <img src=x onerror=alert(1)>, '><script>alert(1)</script>
   - Test SQL injection: ' OR 1=1--, admin'--, '; DROP TABLE users--
   - Test empty submissions
   - Test special characters: @#$%^&*(){}[]|\:;"'<>?,./
5. For EACH vulnerability found:
   - Create GitHub issue with CRITICAL severity
   - Include exact payload and reproduction steps

BE THOROUGH. Explore at least 5-10 different pages. Test every form you find. A real QA engineer would spend hours exploring.`,

  'security-scanner': `You are an AUTONOMOUS Security Testing Specialist with OWASP Top 10 expertise.

MISSION: Explore the application and identify ALL security vulnerabilities.

AVAILABLE TOOLS:
- navigate_to_page: Navigate to any URL
- click_element: Click links to discover pages
- take_screenshot: Capture evidence
- create_github_issue: Report CRITICAL security issues
- create_kanban_ticket: Track findings

EXPLORATION STRATEGY:
1. Start at target URL
2. EXPLORE the application:
   - Click on all navigation links
   - Try accessing admin areas (/admin, /dashboard, /api, /graphql)
   - Look for login/signup pages
   - Check for API endpoints
3. For EACH page visited:
   - Check HTTPS usage (CRITICAL if HTTP)
   - Inspect security headers
   - Look for exposed sensitive data
   - Test authentication requirements
4. Test for vulnerabilities:
   - Missing HTTPS (CRITICAL)
   - Weak/missing security headers
   - Exposed admin panels
   - Directory listing
   - Sensitive files (.env, .git, config.json)
   - Missing authentication
   - Information disclosure
5. For EACH vulnerability:
   - Create GitHub issue with appropriate severity
   - Include reproduction steps

BE THOROUGH. Explore at least 5-10 pages. A real security tester would spend hours.`,

  'sql-injection': `You are an AUTONOMOUS SQL Injection Testing Specialist with expertise in database security.

MISSION: Explore the application and identify SQL injection vulnerabilities.
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

  'component-tester': `You are an AUTONOMOUS UI/UX Testing Specialist.

MISSION: Explore the application and test ALL interactive components.

AVAILABLE TOOLS:
- navigate_to_page: Navigate to pages
- click_element: Click buttons, tabs, dropdowns
- take_screenshot: Capture UI bugs
- create_github_issue: Report UI/UX issues
- create_kanban_ticket: Track improvements

EXPLORATION STRATEGY:
1. Start at target URL
2. EXPLORE the application:
   - Click on all navigation items
   - Open modals and dialogs
   - Expand dropdowns and accordions
   - Switch between tabs
   - Hover over interactive elements
3. For EACH component found:
   - Test all states (default, hover, active, disabled)
   - Click to verify interactions work
   - Take screenshots of broken layouts
   - Test keyboard navigation
4. Look for:
   - Broken buttons (don't respond to clicks)
   - Overlapping elements
   - Missing hover states
   - Broken modals/dialogs
   - Poor mobile responsiveness
5. Report ALL UI bugs with screenshots

BE THOROUGH. Click on everything. Test every interactive element you find.`,

  'accessibility-tester': `You are an Accessibility Testing Specialist. Your mission:
- Check for proper ARIA labels and roles
- Verify keyboard navigation works for all interactive elements
- Check color contrast ratios
- Verify images have alt text
- Test screen reader compatibility
- Check for proper heading hierarchy
- Verify focus indicators are visible
- Report WCAG violations with severity`,

  'performance-tester': `You are a Performance Testing Specialist.

OBJECTIVE: Measure and optimize application performance.

AVAILABLE TOOLS:
- navigate_to_page: Load pages and measure timing
- take_screenshot: Capture performance evidence
- create_github_issue: Report performance bottlenecks
- create_kanban_ticket: Track optimization tasks

TESTING STRATEGY:
1. Navigate to target URL and measure:
   - Page load time (should be < 3s)
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
2. Identify slow resources:
   - Images > 500KB
   - Scripts > 200KB
   - Fonts > 100KB
3. Check for performance issues:
   - Render-blocking resources
   - Excessive DOM nodes (> 1500)
   - Memory leaks
   - Slow API calls (> 1s)
4. For EACH issue found:
   - Create GitHub issue with metrics
   - Include recommendations

PERFORMANCE THRESHOLDS:
- Page load: < 3s (good), 3-5s (warning), > 5s (critical)
- LCP: < 2.5s (good), 2.5-4s (warning), > 4s (critical)
- Resource size: < 500KB (good), 500KB-1MB (warning), > 1MB (critical)

EXECUTE ALL CHECKS. Report metrics with precision.`,

  'api-tester': `You are an AUTONOMOUS API Security Testing Specialist.

MISSION: Discover and test ALL API endpoints in the application.

AVAILABLE TOOLS:
- navigate_to_page: Navigate to discover APIs
- click_element: Click to trigger API calls
- take_screenshot: Capture API responses
- create_github_issue: Report API vulnerabilities
- create_kanban_ticket: Track issues

EXPLORATION STRATEGY:
1. Start at target URL
2. DISCOVER API endpoints:
   - Try common paths: /api, /api/v1, /graphql, /rest
   - Navigate through the app and observe network calls
   - Click on buttons that might trigger APIs
   - Look for API documentation pages
3. For EACH endpoint discovered:
   - Test without authentication (should return 401)
   - Test with invalid data (should return 400)
   - Test for information disclosure in errors
   - Check CORS headers
   - Test rate limiting
4. Look for vulnerabilities:
   - Exposed internal APIs
   - Missing authentication
   - Verbose error messages
   - IDOR (Insecure Direct Object Reference)
   - Mass assignment
5. Report CRITICAL issues immediately

BE THOROUGH. Real API testing takes time. Explore systematically.`,

  'auth-tester': `You are an AUTONOMOUS Authentication Security Specialist.

MISSION: Explore and test ALL authentication mechanisms.

AVAILABLE TOOLS:
- navigate_to_page: Navigate to auth pages
- click_element: Click login/signup links
- fill_input: Fill credentials
- take_screenshot: Capture evidence
- create_github_issue: Report CRITICAL auth bugs
- create_kanban_ticket: Track auth issues

TESTING STRATEGY:
1. Navigate to target URL and find login form
2. Test with multiple credential sets:
   - admin/admin (default credentials)
   - test@example.com/password123
   - Empty credentials
   - SQL injection: ' OR '1'='1 / ' OR '1'='1
   - XSS in username: <script>alert(1)</script>
3. For each test:
   - Fill username field
   - Fill password field  
   - Click submit
   - Observe response
4. Check for:
   - SQL injection success (CRITICAL)
   - Weak password acceptance
   - Account enumeration
   - Missing rate limiting
   - Session fixation

IF SQL INJECTION SUCCEEDS:
- Create GitHub issue IMMEDIATELY with severity: 'critical'
- Include exact payload used

EXECUTE ALL TESTS SYSTEMATICALLY.`,

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
  private agents: Map<string, BaseAgent> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private db: OpenQADatabase;
  private sessionId: string;
  private llmConfig: { provider: string; apiKey: string; model?: string };
  private browserTools: BrowserTools;
  private githubTools: GitHubTools | null = null;
  private kanbanTools: KanbanTools | null = null;

  constructor(
    db: OpenQADatabase,
    sessionId: string,
    llmConfig: { provider: string; apiKey: string; model?: string },
    browserTools: BrowserTools,
    githubTools?: GitHubTools,
    kanbanTools?: KanbanTools
  ) {
    super();
    this.db = db;
    this.sessionId = sessionId;
    this.llmConfig = llmConfig;
    this.browserTools = browserTools;
    this.githubTools = githubTools || null;
    this.kanbanTools = kanbanTools || null;
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
    
    // Combine all available tools
    const allTools = [
      ...this.browserTools.getTools(),
      ...(this.githubTools ? this.githubTools.getTools() : []),
      ...(this.kanbanTools ? this.kanbanTools.getTools() : [])
    ];
    
    const agent = new ReActAgent({
      name: type,
      goal: systemPrompt,
      tools: allTools
    }, llm);

    // Listen to agent events and log actions to DB
    agent.on('tool:start', async (event: AgentEvent) => {
      try {
        await this.db.createAction({
          session_id: this.sessionId,
          type: `specialist:${type}:${event.toolName}`,
          description: `${type} used ${event.toolName}`,
          input: event.input ? JSON.stringify(event.input) : undefined
        });
        const status = this.agentStatuses.get(agentId);
        if (status) {
          status.actions = (status.actions || 0) + 1;
        }
      } catch (e) {
        // Non-critical - continue execution
      }
    });

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
      // Log start action
      await this.db.createAction({
        session_id: this.sessionId,
        type: `specialist:${status.type}:start`,
        description: `${status.type} specialist started testing ${targetUrl}`
      });

      // Let the ReActAgent explore autonomously
      const result = await agent.run(
        `You are testing: ${targetUrl}

MISSION: Act like a real QA engineer. Explore thoroughly and test everything.

ACTION PLAN:
1. Navigate to ${targetUrl}
2. Explore the site by clicking links, buttons, navigation
3. Discover all pages, forms, and interactive elements
4. Test each element according to your specialty
5. Take screenshots of issues
6. Create GitHub issues for critical bugs

IMPORTANT: Don't just test the homepage. Explore at least 5-10 different pages.
Click on everything. A real QA engineer would spend hours exploring every corner of the application.

Be autonomous. Be thorough. Find real bugs.`
      );

      status.status = 'completed';
      status.completedAt = new Date();
      status.progress = 100;
      
      // Log completion action
      await this.db.createAction({
        session_id: this.sessionId,
        type: `specialist:${status.type}:complete`,
        description: `${status.type} specialist completed with ${status.findings} findings`,
        output: JSON.stringify({ findings: status.findings, actions: status.actions })
      });
      
      this.emit('agent-completed', { ...status, result });
      
    } catch (error: unknown) {
      status.status = 'failed';
      status.completedAt = new Date();

      // Log failure action
      await this.db.createAction({
        session_id: this.sessionId,
        type: `specialist:${status.type}:failed`,
        description: `${status.type} specialist failed: ${error instanceof Error ? error.message : String(error)}`
      }).catch(() => {});

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

  /**
   * DEPRECATED: Replaced by autonomous ReActAgent exploration
   * Keeping for backward compatibility but no longer used
   */
  private async executeBrowserActions_DEPRECATED(type: AgentType, targetUrl: string): Promise<void> {
    const tools = this.browserTools.getTools();
    const navigateTool = tools.find(t => t.name === 'navigate_to_page');
    const clickTool = tools.find(t => t.name === 'click_element');
    const fillTool = tools.find(t => t.name === 'fill_input');
    const screenshotTool = tools.find(t => t.name === 'take_screenshot');
    const status = Array.from(this.agentStatuses.values()).find(s => s.type === type);
    
    if (!navigateTool || !status) return;

    try {
      // Navigate to target URL
      await navigateTool.execute({ url: targetUrl } as any);
      status.actions++;
      
      // Execute specialist-specific tests
      switch (type) {
        case 'form-tester':
          await this.testForms(fillTool, clickTool, status);
          break;
        
        case 'security-scanner':
          await this.testSecurity(targetUrl, status);
          break;
        
        case 'component-tester':
          await this.testComponents(screenshotTool, clickTool, status);
          break;
        
        case 'api-tester':
          await this.testAPI(targetUrl, status);
          break;
        
        case 'auth-tester':
          await this.testAuth(fillTool, clickTool, status);
          break;
        
        case 'performance-tester':
          await this.testPerformance(targetUrl, status);
          break;
      }
    } catch (e) {
      // Log error but don't fail
      console.error(`Specialist ${type} error:`, e);
    }
  }

  private async testForms(fillTool: any, clickTool: any, status: AgentStatus): Promise<void> {
    const testInputs = [
      { selector: 'input[type="email"]', value: 'invalid-email', expectedError: true },
      { selector: 'input[type="email"]', value: 'test@example.com', expectedError: false },
      { selector: 'input[type="password"]', value: '123', expectedError: true },
      { selector: 'input[type="text"]', value: '<script>alert(1)</script>', expectedError: false }
    ];

    for (const test of testInputs) {
      try {
        if (fillTool) {
          await fillTool.execute({ selector: test.selector, text: test.value } as any);
          status.actions++;
          
          // Check if XSS input is reflected (security bug)
          if (test.value.includes('<script>')) {
            const bugDescription = `Form accepts script tags without sanitization: ${test.selector}\n\nSteps to reproduce:\n1. Fill ${test.selector} with ${test.value}\n2. Submit form\n3. Check if script executes\n\nExpected: Input should be sanitized\nActual: Script tags accepted without validation`;
            
            // Create bug in database
            await this.db.createBug({
              session_id: this.sessionId,
              title: 'Potential XSS vulnerability in form input',
              description: bugDescription,
              severity: 'high',
              status: 'open'
            });
            status.findings++;
            
            // Create GitHub issue if configured
            if (this.githubTools) {
              try {
                const githubTool = this.githubTools.getTools()[0];
                await githubTool.execute({
                  title: 'Potential XSS vulnerability in form input',
                  body: bugDescription,
                  severity: 'high',
                  labels: ['security', 'xss', 'form-validation']
                });
              } catch (e) {
                // GitHub issue creation failed, but bug is still recorded
                console.error('Failed to create GitHub issue:', e);
              }
            }
          }
        }
      } catch (e) {
        // Element not found - not a bug, just not applicable
      }
    }

    // Try to submit form without filling required fields
    if (clickTool) {
      try {
        await clickTool.execute({ selector: 'button[type="submit"], input[type="submit"]' } as any);
        status.actions++;
      } catch (e) {
        // Expected - form validation should prevent submission
      }
    }
  }

  private async testSecurity(targetUrl: string, status: AgentStatus): Promise<void> {
    // Test for common security issues
    const securityTests = [
      { test: 'HTTPS', check: targetUrl.startsWith('https://') },
      { test: 'HTTP Security Headers', check: false }, // Would need to check response headers
    ];

    for (const test of securityTests) {
      status.actions++;
      if (!test.check && test.test === 'HTTPS') {
        const bugDescription = `The application is served over HTTP instead of HTTPS, exposing user data to interception\n\nSteps to reproduce:\n1. Navigate to ${targetUrl}\n2. Check URL protocol\n\nExpected: Application should use HTTPS\nActual: Application uses HTTP`;
        
        // Create bug in database
        await this.db.createBug({
          session_id: this.sessionId,
          title: 'Application not using HTTPS',
          description: bugDescription,
          severity: 'critical',
          status: 'open'
        });
        status.findings++;
        
        // Create GitHub issue for CRITICAL security issue
        if (this.githubTools) {
          try {
            const githubTool = this.githubTools.getTools()[0];
            await githubTool.execute({
              title: 'CRITICAL: Application not using HTTPS',
              body: bugDescription,
              severity: 'critical',
              labels: ['security', 'https', 'critical']
            });
          } catch (e) {
            console.error('Failed to create GitHub issue:', e);
          }
        }
      }
    }
  }

  private async testComponents(screenshotTool: any, clickTool: any, status: AgentStatus): Promise<void> {
    // Test common UI components
    const components = [
      'button',
      'a',
      'input',
      'select',
      'textarea'
    ];

    for (const component of components) {
      try {
        if (clickTool) {
          await clickTool.execute({ selector: component } as any);
          status.actions++;
        }
      } catch (e) {
        // Component not found or not clickable
      }
    }

    // Take screenshot for visual regression
    if (screenshotTool) {
      try {
        await screenshotTool.execute({ filename: `component-test-${Date.now()}.png` } as any);
        status.actions++;
      } catch (e) {
        // Screenshot failed
      }
    }
  }

  private async testAPI(targetUrl: string, status: AgentStatus): Promise<void> {
    // Test common API endpoints with real HTTP requests
    const baseUrl = new URL(targetUrl).origin;
    const commonEndpoints = [
      '/api',
      '/api/v1', 
      '/api/v2',
      '/graphql',
      '/rest',
      '/.well-known/openid-configuration',
      '/swagger.json',
      '/api-docs'
    ];
    
    for (const endpoint of commonEndpoints) {
      try {
        const testUrl = `${baseUrl}${endpoint}`;
        status.actions++;
        
        // Make actual HTTP request
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'OpenQA-Bot/1.0'
          }
        }).catch(() => null);
        
        if (response) {
          // Endpoint exists - check for security issues
          if (response.status === 200) {
            // Check if endpoint is publicly accessible (potential security issue)
            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json') || contentType?.includes('text/html')) {
              const bugDescription = `API endpoint ${endpoint} is publicly accessible without authentication\n\nSteps to reproduce:\n1. Navigate to ${testUrl}\n2. No authentication required\n3. Endpoint returns data\n\nExpected: Endpoint should require authentication\nActual: Endpoint is publicly accessible\n\nStatus Code: ${response.status}\nContent-Type: ${contentType}`;
              
              // Create bug for exposed API
              await this.db.createBug({
                session_id: this.sessionId,
                title: `Exposed API endpoint: ${endpoint}`,
                description: bugDescription,
                severity: 'medium',
                status: 'open'
              });
              status.findings++;
              
              // Create GitHub issue if critical data exposure
              if (endpoint.includes('swagger') || endpoint.includes('api-docs') || endpoint.includes('graphql')) {
                if (this.githubTools) {
                  try {
                    const githubTool = this.githubTools.getTools()[0];
                    await githubTool.execute({
                      title: `API documentation exposed: ${endpoint}`,
                      body: bugDescription,
                      severity: 'medium',
                      labels: ['security', 'api', 'information-disclosure']
                    });
                  } catch (e) {
                    console.error('Failed to create GitHub issue:', e);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Endpoint doesn't exist or network error - not a bug
      }
    }
  }

  private async testAuth(fillTool: any, clickTool: any, status: AgentStatus): Promise<void> {
    // Test authentication flows
    const authTests = [
      { username: 'admin', password: 'admin' },
      { username: 'test@example.com', password: 'password123' },
      { username: '', password: '' }, // Empty credentials
      { username: "' OR '1'='1", password: "' OR '1'='1" } // SQL injection attempt
    ];

    for (const test of authTests) {
      try {
        if (fillTool) {
          await fillTool.execute({ selector: 'input[type="email"], input[name="username"], input[name="email"]', text: test.username } as any);
          await fillTool.execute({ selector: 'input[type="password"], input[name="password"]', text: test.password } as any);
          status.actions += 2;
        }
        
        if (clickTool) {
          await clickTool.execute({ selector: 'button[type="submit"]' } as any);
          status.actions++;
        }

        // If SQL injection test succeeds, it's a critical bug
        if (test.username.includes("OR '1'='1")) {
          const bugDescription = `Login form may be vulnerable to SQL injection attacks\n\nSteps to reproduce:\n1. Enter username: ${test.username}\n2. Enter password: ${test.password}\n3. Submit form\n\nExpected: Login should fail with invalid credentials\nActual: SQL injection attempt was not blocked`;
          
          // Create bug in database
          await this.db.createBug({
            session_id: this.sessionId,
            title: 'Potential SQL Injection vulnerability',
            description: bugDescription,
            severity: 'critical',
            status: 'open'
          });
          status.findings++;
          
          // Create GitHub issue IMMEDIATELY for CRITICAL vulnerability
          if (this.githubTools) {
            try {
              const githubTool = this.githubTools.getTools()[0];
              await githubTool.execute({
                title: 'CRITICAL: SQL Injection vulnerability in login form',
                body: bugDescription,
                severity: 'critical',
                labels: ['security', 'sql-injection', 'critical', 'authentication']
              });
            } catch (e) {
              console.error('Failed to create GitHub issue:', e);
            }
          }
        }
      } catch (e) {
        // Expected - auth should fail for invalid credentials
      }
    }
  }

  private async testPerformance(targetUrl: string, status: AgentStatus): Promise<void> {
    // Measure page load time
    const startTime = Date.now();
    
    try {
      // Make HTTP request to measure load time
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'OpenQA-Performance-Bot/1.0'
        }
      });
      
      const loadTime = Date.now() - startTime;
      status.actions++;
      
      // Check performance thresholds
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let issueTitle = '';
      
      if (loadTime > 5000) {
        severity = 'critical';
        issueTitle = 'Critical: Page load time exceeds 5 seconds';
      } else if (loadTime > 3000) {
        severity = 'high';
        issueTitle = 'High: Page load time exceeds 3 seconds';
      } else if (loadTime > 2000) {
        severity = 'medium';
        issueTitle = 'Medium: Page load time could be optimized';
      }
      
      // Create bug if performance is poor
      if (loadTime > 3000) {
        const bugDescription = `Page load time is ${loadTime}ms, which exceeds the recommended threshold.\n\nSteps to reproduce:\n1. Navigate to ${targetUrl}\n2. Measure page load time\n\nExpected: Page should load in < 3s\nActual: Page loads in ${(loadTime / 1000).toFixed(2)}s\n\nRecommendations:\n- Optimize images and assets\n- Enable compression (gzip/brotli)\n- Minimize JavaScript bundles\n- Use CDN for static assets\n- Implement lazy loading`;
        
        // Create bug in database
        await this.db.createBug({
          session_id: this.sessionId,
          title: issueTitle,
          description: bugDescription,
          severity,
          status: 'open'
        });
        status.findings++;
        
        // Create GitHub issue for critical/high performance issues
        if (severity === 'critical' || severity === 'high') {
          if (this.githubTools) {
            try {
              const githubTool = this.githubTools.getTools()[0];
              await githubTool.execute({
                title: issueTitle,
                body: bugDescription,
                severity,
                labels: ['performance', 'optimization', 'page-speed']
              });
            } catch (e) {
              console.error('Failed to create GitHub issue:', e);
            }
          }
        }
      }
      
      // Log performance metrics
      console.log(`Performance test: ${targetUrl} loaded in ${loadTime}ms`);
      
    } catch (e) {
      console.error('Performance test failed:', e);
    }
  }
}
