/**
 * ProjectIntelligenceAnalyzer
 *
 * The "brain before the brain". Runs FIRST, before any testing begins.
 * Determines:
 *   - What kind of application this is (domain)
 *   - How serious / risky it is (riskLevel)
 *   - Which regulatory standards apply (GDPR, PCI-DSS, HIPAA …)
 *   - Which specialist agents to activate and in which order
 *   - Which agents to CREATE on the fly (not pre-coded)
 *   - What to put in the Kanban before a single test runs
 *
 * This is what makes OpenQA behave like a senior QA engineer rather than a script.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AgentType } from '../specialists/index.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DomainType =
  | 'fintech'          // payments, banking, trading, insurance
  | 'healthcare'       // medical, telemedicine, patient data
  | 'ecommerce'        // shopping cart, marketplace, physical goods
  | 'saas-b2b'         // business tool, dashboard, admin
  | 'saas-consumer'    // consumer app, social, productivity
  | 'government'       // public sector, citizen services
  | 'developer-tools'  // API, CLI, devtool, documentation
  | 'media'            // content, streaming, news
  | 'education'        // e-learning, LMS
  | 'unknown';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface MandatoryCheck {
  category: 'security' | 'compliance' | 'performance' | 'accessibility' | 'data-integrity' | 'availability' | 'functional';
  name: string;
  reason: string;
  owaspRef?: string;   // e.g. "OWASP A01:2021"
  priority: 'critical' | 'high' | 'medium';
}

export interface AgentBlueprint {
  name: string;
  role: string;
  goal: string;
  systemPrompt: string;
  tools: string[];
  priority: number;    // execution order (lower = first)
  triggerCondition: string;
}

export interface TestingStrategy {
  depth: 'exhaustive' | 'thorough' | 'standard' | 'basic';
  primaryFocus: string[];      // areas to test most deeply
  secondaryFocus: string[];    // areas to cover but not exhaustively
  requiredTestTypes: Array<'security' | 'functional' | 'e2e' | 'performance' | 'accessibility' | 'regression'>;
  estimatedSessionMinutes: number;
}

export interface KanbanSuggestion {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  column: 'backlog' | 'to-do';
  category: 'security' | 'improvement' | 'tech-debt' | 'compliance' | 'missing-test' | 'performance';
  tags: string[];
}

export interface ProjectIntelligence {
  domain: DomainType;
  riskLevel: RiskLevel;
  regulatoryContext: string[];     // ['GDPR', 'PCI-DSS', 'WCAG 2.1']
  criticalPaths: string[];         // user flows that MUST work
  mandatoryChecks: MandatoryCheck[];
  suggestedSpecialists: AgentType[];
  dynamicAgentBlueprints: AgentBlueprint[];
  testingStrategy: TestingStrategy;
  kanbanSuggestions: KanbanSuggestion[];
  techStackSignals: string[];      // detected tech signals before LLM
  reasoning: string;               // the analyst's full explanation
}

// ── Heuristic signal detection ─────────────────────────────────────────────────

interface StaticSignals {
  keywords: string[];
  deps: string[];
  hasAuth: boolean;
  hasPayments: boolean;
  hasHealthData: boolean;
  hasFileUpload: boolean;
  hasAdmin: boolean;
  hasAPI: boolean;
  hasUserData: boolean;
}

function detectStaticSignals(url: string, repoPath?: string): StaticSignals {
  const urlLower = url.toLowerCase();
  const keywords: string[] = [];
  const deps: string[] = [];

  // URL-based signals
  const urlKeywords = [
    'pay', 'bank', 'wallet', 'finance', 'fintech', 'invest', 'trade', 'credit',
    'health', 'medical', 'patient', 'clinic', 'doctor', 'hospital',
    'shop', 'store', 'cart', 'checkout', 'order', 'product',
    'admin', 'dashboard', 'panel', 'management',
    'api', 'docs', 'developer', 'sdk',
    'learn', 'course', 'lms', 'edu',
    'gov', 'public', 'citizen', 'municipal',
  ];
  for (const kw of urlKeywords) {
    if (urlLower.includes(kw)) keywords.push(kw);
  }

  // Repo-based signals
  if (repoPath && existsSync(repoPath)) {
    const pkgPath = join(repoPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        deps.push(...Object.keys(allDeps));

        // Detect signals from dep names
        const depSignals: Record<string, string> = {
          'stripe': 'payments', '@stripe': 'payments',
          'braintree': 'payments', 'paypal': 'payments',
          'square': 'payments', 'klarna': 'payments',
          'passport': 'auth', 'next-auth': 'auth', 'auth0': 'auth',
          'bcrypt': 'auth', 'jsonwebtoken': 'auth',
          'multer': 'file-upload', 'formidable': 'file-upload', 'busboy': 'file-upload',
          'sequelize': 'database', 'mongoose': 'database', 'prisma': 'database',
          'pg': 'database', 'mysql2': 'database',
          'express': 'api', 'fastify': 'api', 'koa': 'api',
          'react-admin': 'admin', 'adminjs': 'admin',
          '@sentry/node': 'monitoring', 'datadog': 'monitoring',
        };
        for (const [dep, signal] of Object.entries(depSignals)) {
          if (allDeps[dep]) keywords.push(signal);
        }
      } catch { /* ignore */ }
    }
  }

  const kw = keywords.join(' ');
  return {
    keywords,
    deps,
    hasAuth:       kw.includes('auth') || kw.includes('passport') || kw.includes('login'),
    hasPayments:   kw.includes('pay') || kw.includes('stripe') || kw.includes('braintree') || kw.includes('wallet'),
    hasHealthData: kw.includes('health') || kw.includes('medical') || kw.includes('patient'),
    hasFileUpload: kw.includes('file-upload') || kw.includes('multer'),
    hasAdmin:      kw.includes('admin') || kw.includes('dashboard') || kw.includes('management'),
    hasAPI:        kw.includes('api') || kw.includes('developer') || kw.includes('sdk'),
    hasUserData:   kw.includes('auth') || kw.includes('pay') || kw.includes('health'),
  };
}

// ── Domain + risk rules (applied BEFORE LLM, grounding its context) ───────────

function deriveRuleBasedContext(signals: StaticSignals): {
  domain: DomainType;
  riskLevel: RiskLevel;
  regulations: string[];
} {
  let domain: DomainType = 'unknown';
  let riskLevel: RiskLevel = 'medium';
  const regulations: string[] = [];

  const kw = signals.keywords;

  if (signals.hasPayments) {
    domain = 'fintech';
    riskLevel = 'critical';
    regulations.push('PCI-DSS', 'GDPR');
  } else if (signals.hasHealthData) {
    domain = 'healthcare';
    riskLevel = 'critical';
    regulations.push('HIPAA', 'GDPR', 'HL7 FHIR');
  } else if (kw.some(k => ['shop', 'store', 'cart', 'checkout', 'order', 'product'].includes(k))) {
    domain = 'ecommerce';
    riskLevel = 'high';
    regulations.push('GDPR', 'PCI-DSS');
  } else if (kw.some(k => ['gov', 'public', 'citizen', 'municipal'].includes(k))) {
    domain = 'government';
    riskLevel = 'high';
    regulations.push('GDPR', 'WCAG 2.1 AA', 'RGAA');
  } else if (kw.some(k => ['learn', 'course', 'lms', 'edu'].includes(k))) {
    domain = 'education';
    riskLevel = 'medium';
    regulations.push('GDPR', 'FERPA', 'COPPA', 'WCAG 2.1 AA');
  } else if (signals.hasAPI && !signals.hasAdmin) {
    domain = 'developer-tools';
    riskLevel = 'medium';
    regulations.push('OWASP API Security Top 10');
  } else if (signals.hasAdmin) {
    domain = 'saas-b2b';
    riskLevel = 'high';
    regulations.push('GDPR', 'SOC 2');
  } else if (signals.hasUserData || signals.hasAuth) {
    domain = 'saas-consumer';
    riskLevel = 'medium';
    regulations.push('GDPR');
  }

  // Always add WCAG if it's user-facing
  if (!regulations.includes('WCAG 2.1 AA') && domain !== 'developer-tools') {
    regulations.push('WCAG 2.1 AA');
  }

  return { domain, riskLevel, regulations };
}

// ── Mandatory checks catalogue ─────────────────────────────────────────────────

const DOMAIN_MANDATORY_CHECKS: Record<DomainType | 'default', MandatoryCheck[]> = {
  fintech: [
    { category: 'security', name: 'CSRF protection on all financial transactions', reason: 'OWASP A01 — state-changing endpoints without CSRF tokens allow attackers to forge payment requests', owaspRef: 'OWASP A01:2021', priority: 'critical' },
    { category: 'security', name: 'Rate limiting on login and payment APIs', reason: 'Brute-force attacks on financial accounts have direct monetary impact', owaspRef: 'OWASP A04:2021', priority: 'critical' },
    { category: 'security', name: 'PCI-DSS: No card data in logs or URLs', reason: 'Card numbers in logs = PCI-DSS violation and legal liability', priority: 'critical' },
    { category: 'security', name: 'Session invalidation after logout and timeout', reason: 'Stale sessions allow unauthorized access to financial data', owaspRef: 'OWASP A07:2021', priority: 'critical' },
    { category: 'data-integrity', name: 'Decimal precision on all monetary values', reason: 'Floating-point errors in financial calculations cause real losses', priority: 'critical' },
    { category: 'security', name: 'SQL injection on all input fields', reason: 'Financial data is a prime target for SQL injection attacks', owaspRef: 'OWASP A03:2021', priority: 'critical' },
    { category: 'security', name: 'HTTPS enforced — no mixed content', reason: 'Payment data transmitted over HTTP is interceptable', priority: 'critical' },
    { category: 'compliance', name: 'GDPR: Data deletion / right to be forgotten', reason: 'Financial apps process personal data — deletion must be provable', priority: 'high' },
    { category: 'availability', name: 'Payment flow under concurrent load', reason: 'Payment outages have direct revenue impact', priority: 'high' },
  ],
  healthcare: [
    { category: 'security', name: 'PHI never exposed in URLs or logs', reason: 'HIPAA requires PHI to be protected at all times — URL exposure is a violation', priority: 'critical' },
    { category: 'security', name: 'Authentication: MFA enforced for medical staff', reason: 'Medical accounts control access to patient records — weak auth = HIPAA breach', priority: 'critical' },
    { category: 'compliance', name: 'Audit log: who accessed which patient record and when', reason: 'HIPAA requires complete audit trails for all PHI access', priority: 'critical' },
    { category: 'security', name: 'Encryption at rest for all patient data', reason: 'Unencrypted patient data violates HIPAA Security Rule', priority: 'critical' },
    { category: 'security', name: 'API: role-based access — nurse cannot read doctor notes', reason: 'Broken Object-Level Authorization is the #1 API vulnerability', owaspRef: 'OWASP API1:2023', priority: 'critical' },
    { category: 'accessibility', name: 'WCAG 2.1 AA: full keyboard navigation', reason: 'Healthcare tools are used by users with disabilities — legal requirement', priority: 'high' },
    { category: 'data-integrity', name: 'Medication dosage fields: input validation and range checks', reason: 'Incorrect dosages due to input bugs can cause patient harm', priority: 'critical' },
  ],
  ecommerce: [
    { category: 'security', name: 'XSS in product names, reviews, search fields', reason: 'Stored XSS in product data can steal session cookies of all customers', owaspRef: 'OWASP A03:2021', priority: 'critical' },
    { category: 'security', name: 'CSRF protection on cart and checkout actions', reason: 'Attackers can force users to add items or complete purchases', priority: 'critical' },
    { category: 'data-integrity', name: 'Inventory: concurrent purchase does not oversell', reason: 'Race condition in stock check leads to negative inventory and fulfillment issues', priority: 'high' },
    { category: 'security', name: 'Price tampering: validate server-side, not from client payload', reason: 'Client-side price manipulation is a classic e-commerce attack', priority: 'critical' },
    { category: 'performance', name: 'Checkout flow < 3s under 100 concurrent users', reason: 'Slow checkout directly reduces conversion rate', priority: 'high' },
    { category: 'compliance', name: 'GDPR: guest checkout without forced account creation', reason: 'Forcing account creation for purchases violates GDPR consent rules', priority: 'high' },
    { category: 'functional', name: 'Complete order flow: add to cart → checkout → confirmation email', reason: 'The primary revenue path must be 100% reliable', priority: 'critical' } as MandatoryCheck,
  ],
  'saas-b2b': [
    { category: 'security', name: 'Multi-tenant isolation: tenant A cannot see tenant B data', reason: 'Broken tenancy is a catastrophic security failure in B2B SaaS', priority: 'critical' },
    { category: 'security', name: 'RBAC: viewer role cannot perform admin actions', reason: 'Privilege escalation via missing RBAC is a common B2B vulnerability', owaspRef: 'OWASP A01:2021', priority: 'critical' },
    { category: 'security', name: 'API keys: rotation, scoping, and revocation', reason: 'API keys are the main access method in B2B — must be manageable', priority: 'high' },
    { category: 'availability', name: 'SLA: core features available under 1000 concurrent users', reason: 'B2B customers have contractual SLA expectations', priority: 'high' },
    { category: 'compliance', name: 'Data export: full tenant data export within 72h (GDPR Art.20)', reason: 'B2B customers may request their data — this must work', priority: 'high' },
  ],
  'saas-consumer': [
    { category: 'security', name: 'Account enumeration prevention on login/signup', reason: 'Leaking which emails are registered enables targeted attacks', priority: 'high' },
    { category: 'security', name: 'Password reset: token expiry and single-use enforcement', reason: 'Long-lived reset tokens allow account takeover', priority: 'high' },
    { category: 'compliance', name: 'GDPR: cookie consent banner functional and dismissible', reason: 'Non-functional cookie banners are an immediate CNIL/ICO fine risk', priority: 'high' },
    { category: 'accessibility', name: 'WCAG 2.1 AA compliance for primary user flows', reason: 'Legal requirement in EU/UK; improves UX for 1 in 4 users', priority: 'medium' },
  ],
  government: [
    { category: 'accessibility', name: 'WCAG 2.1 AA — entire site (legal mandate)', reason: 'EU Web Accessibility Directive requires AA compliance for all government sites', priority: 'critical' },
    { category: 'security', name: 'No third-party trackers on sensitive government forms', reason: 'Privacy regulations prohibit tracking on citizen data submissions', priority: 'critical' },
    { category: 'performance', name: 'Works on low-bandwidth connections (3G simulation)', reason: 'Public services must be accessible to all citizens regardless of connection quality', priority: 'high' },
  ],
  'developer-tools': [
    { category: 'security', name: 'API: authentication required — no unauthenticated data access', priority: 'critical', reason: 'All API endpoints must require auth unless explicitly public', owaspRef: 'OWASP API2:2023' },
    { category: 'security', name: 'API rate limiting to prevent abuse', priority: 'high', reason: 'Unprotected APIs are scraped and abused', owaspRef: 'OWASP API4:2023' },
    { category: 'security', name: 'Input validation: reject oversized payloads', priority: 'high', reason: 'Missing payload size limits enable DoS via large request bodies', owaspRef: 'OWASP API4:2023' },
    { category: 'functional', name: 'SDK code examples in docs actually work', priority: 'high', reason: 'Broken documentation examples are the #1 developer frustration', } as MandatoryCheck,
  ],
  education: [
    { category: 'compliance', name: 'COPPA: no personal data collected from users under 13 without parental consent', priority: 'critical', reason: 'COPPA violations carry federal penalties in the US' },
    { category: 'accessibility', name: 'WCAG 2.1 AA: course content readable by screen readers', priority: 'high', reason: 'Education platforms must be inclusive — often legally required' },
    { category: 'data-integrity', name: 'Progress and grade data persists across sessions', priority: 'critical', reason: 'Lost learning progress destroys user trust immediately' },
  ],
  media: [
    { category: 'performance', name: 'Core Web Vitals: LCP < 2.5s, CLS < 0.1', priority: 'high', reason: 'Google ranking factor — slow media sites lose organic traffic' },
    { category: 'security', name: 'User-generated content: XSS in comments and captions', priority: 'high', reason: 'UGC platforms are a classic XSS vector', owaspRef: 'OWASP A03:2021' },
  ],
  unknown: [],
  default: [
    { category: 'security', name: 'OWASP Top 10: SQL Injection, XSS, broken auth', priority: 'high', reason: 'Baseline security coverage for any web application', owaspRef: 'OWASP Top 10' },
    { category: 'accessibility', name: 'WCAG 2.1 AA: keyboard navigation and screen reader support', priority: 'medium', reason: 'Legal requirement in most jurisdictions; improves UX for all users' },
    { category: 'performance', name: 'Core Web Vitals within Google thresholds', priority: 'medium', reason: 'SEO and user experience baseline' },
  ],
};

// ── Specialist selection by domain/risk ───────────────────────────────────────

function selectSpecialists(domain: DomainType, riskLevel: RiskLevel, signals: StaticSignals): AgentType[] {
  const base: AgentType[] = ['navigation-tester', 'form-tester', 'component-tester'];

  if (riskLevel === 'critical' || riskLevel === 'high') {
    base.push('security-scanner', 'auth-tester');
  }

  if (signals.hasPayments) {
    base.push('sql-injection', 'xss-tester', 'api-tester');
  }

  if (domain === 'healthcare' || domain === 'government') {
    base.push('accessibility-tester', 'sql-injection', 'xss-tester');
  }

  if (domain === 'developer-tools') {
    base.push('api-tester', 'security-scanner');
  }

  if (riskLevel === 'medium' || riskLevel === 'low') {
    base.push('accessibility-tester', 'performance-tester');
  } else {
    base.push('performance-tester'); // always include perf
  }

  // Deduplicate preserving order
  return [...new Set(base)] as AgentType[];
}

// ── Dynamic agent blueprints (agents invented on the fly) ─────────────────────

function buildDynamicAgentBlueprints(domain: DomainType, signals: StaticSignals, url: string): AgentBlueprint[] {
  const blueprints: AgentBlueprint[] = [];

  if (signals.hasPayments) {
    blueprints.push({
      name: 'Payment Flow Integrity Agent',
      role: 'Financial QA Specialist',
      goal: 'Verify that the complete payment flow works correctly and cannot be manipulated',
      systemPrompt: `You are a specialized Payment Flow Integrity Agent with expertise in fintech QA.
Your mission: test the COMPLETE payment journey on ${url}.

WHAT TO TEST:
1. Navigate to the payment/checkout page
2. Attempt to modify the price in the request payload (price tampering)
3. Test with declined card: 4000 0000 0000 0002 (Stripe test card)
4. Test with insufficient funds: 4000 0000 0000 9995
5. Verify the confirmation page shows correct amount (no rounding errors)
6. Check that payment failure shows a clear, actionable error message
7. Verify no card data appears in the page source, logs, or URL
8. Test that double-clicking "Pay" does not charge twice

For each issue found: create a GitHub issue (severity: critical) AND a Kanban ticket.`,
      tools: ['navigate_to_page', 'click_element', 'fill_input', 'take_screenshot', 'get_page_content', 'create_github_issue', 'create_kanban_ticket'],
      priority: 1,
      triggerCondition: 'hasPayments === true',
    });
  }

  if (signals.hasFileUpload) {
    blueprints.push({
      name: 'File Upload Security Agent',
      role: 'Upload Vulnerability Specialist',
      goal: 'Test all file upload endpoints for security vulnerabilities',
      systemPrompt: `You are a File Upload Security Specialist.
Your mission: find and test ALL file upload functionalities on ${url}.

WHAT TO TEST:
1. Find all file upload inputs (profile photo, attachments, imports, etc.)
2. Upload a file with double extension: malware.php.jpg
3. Upload a file with misleading Content-Type (text/html file sent as image/jpeg)
4. Upload an SVG file containing embedded JavaScript: <svg onload="alert(1)"/>
5. Upload a very large file (test for DoS via large uploads)
6. Upload a ZIP bomb (only describe, don't execute)
7. Verify that uploaded files are not executable from a public URL

Document all findings with screenshots. Create Kanban tickets for each vulnerability.`,
      tools: ['navigate_to_page', 'click_element', 'fill_input', 'take_screenshot', 'get_page_content', 'create_kanban_ticket'],
      priority: 2,
      triggerCondition: 'hasFileUpload === true',
    });
  }

  if (domain === 'ecommerce') {
    blueprints.push({
      name: 'E-commerce Race Condition Agent',
      role: 'Concurrency & Inventory Specialist',
      goal: 'Test for race conditions in cart and checkout that could allow overselling',
      systemPrompt: `You are an E-commerce Concurrency Testing Specialist.
Your mission: test inventory and cart race conditions on ${url}.

WHAT TO TEST:
1. Navigate to a product page and observe the stock level
2. Add the same item to cart multiple times rapidly
3. Check if the price shown in cart matches the price at checkout (price consistency)
4. Look for any "only X left" warnings and test adding more than that quantity
5. Navigate to checkout and check if session timeout during payment is handled gracefully
6. Test: can you complete an order with a coupon code more than once?
7. Check: does the cart persist correctly after page refresh?

Create a Kanban ticket for EVERY inconsistency found.`,
      tools: ['navigate_to_page', 'click_element', 'fill_input', 'take_screenshot', 'get_page_content', 'create_kanban_ticket'],
      priority: 2,
      triggerCondition: 'domain === "ecommerce"',
    });
  }

  if (signals.hasAdmin) {
    blueprints.push({
      name: 'Privilege Escalation Agent',
      role: 'Authorization & RBAC Specialist',
      goal: 'Test that role-based access controls cannot be bypassed',
      systemPrompt: `You are a Privilege Escalation and RBAC Testing Specialist.
Your mission: verify that lower-privileged users cannot access higher-privileged features on ${url}.

WHAT TO TEST:
1. Navigate to the admin panel / settings / management section
2. Try to access admin URLs directly without admin credentials
3. Try to access another user's data by modifying IDs in URLs (/user/123 → /user/124)
4. Look for API endpoints that return more data than the UI shows (data over-exposure)
5. Try to perform admin actions (delete, promote user, change settings) as a viewer role
6. Check: does the 403 error reveal which admin features exist?
7. Test IDOR: can you access objects that belong to other users?

CRITICAL: Any privilege escalation = GitHub issue + critical Kanban ticket immediately.`,
      tools: ['navigate_to_page', 'click_element', 'fill_input', 'take_screenshot', 'get_page_content', 'create_github_issue', 'create_kanban_ticket'],
      priority: 1,
      triggerCondition: 'hasAdmin === true',
    });
  }

  if (domain === 'healthcare') {
    blueprints.push({
      name: 'HIPAA Compliance Audit Agent',
      role: 'Healthcare Regulatory Compliance Specialist',
      goal: 'Verify that patient data is protected according to HIPAA requirements',
      systemPrompt: `You are a HIPAA Compliance QA Specialist.
Your mission: audit ${url} for HIPAA compliance violations.

WHAT TO CHECK:
1. Check HTTPS is enforced on ALL pages — no HTTP fallback
2. Look for PHI (patient names, diagnoses, medications) appearing in browser URLs
3. Check that session expires after inactivity (typically 15-30 min for healthcare)
4. Verify the audit log records: WHO accessed WHICH patient record WHEN
5. Check that the logout button actually invalidates the server-side session (not just clears cookie)
6. Look for any patient data in console.log or network request parameters
7. Test: can you access another patient's records by changing an ID in the URL?
8. Check: does the site have a visible Privacy Policy and Terms of Service?

Every HIPAA violation = critical GitHub issue + critical Kanban ticket.`,
      tools: ['navigate_to_page', 'click_element', 'take_screenshot', 'get_page_content', 'check_console_errors', 'create_github_issue', 'create_kanban_ticket'],
      priority: 1,
      triggerCondition: 'domain === "healthcare"',
    });
  }

  // Universal agents always created
  blueprints.push({
    name: 'Dead Link & 404 Hunter',
    role: 'Navigation Integrity Specialist',
    goal: 'Find all broken links, missing assets, and 404 errors across the application',
    systemPrompt: `You are a Navigation Integrity Specialist.
Your mission: crawl ${url} and find every broken link and missing resource.

STRATEGY:
1. Start at the homepage
2. Click every visible link and button
3. For each new page: take screenshot, check for 404 errors, check console for errors
4. Note every link that returns 4xx or 5xx
5. Check that navigation breadcrumbs work correctly
6. Verify the footer links (privacy policy, terms, contact)
7. Check that 404 pages themselves have helpful navigation back to the site

Create a Kanban ticket for each section with broken links.`,
    tools: ['navigate_to_page', 'click_element', 'take_screenshot', 'get_page_content', 'check_console_errors', 'create_kanban_ticket'],
    priority: 3,
    triggerCondition: 'always',
  });

  blueprints.push({
    name: 'UX & Error Message Quality Agent',
    role: 'User Experience Evaluator',
    goal: 'Assess whether error messages, empty states, and edge cases are handled with good UX',
    systemPrompt: `You are a UX Quality Evaluator focused on error handling and edge cases.
Your mission: find every place where the app fails to guide the user gracefully on ${url}.

WHAT TO TEST:
1. Submit every form with empty fields — are error messages clear and specific?
2. Try to navigate to a URL that does not exist — is the 404 page helpful?
3. Disable JavaScript and reload — does the app fail silently or notify the user?
4. Test with a very slow connection (observe loading states)
5. Resize the browser to mobile width — does the layout break?
6. Try actions that should not be possible (double-submit, back button after form submit)
7. Test copy/paste behavior in all form fields

For each UX issue: create a Kanban ticket with priority=medium and category improvement.`,
    tools: ['navigate_to_page', 'click_element', 'fill_input', 'take_screenshot', 'get_page_content', 'create_kanban_ticket'],
    priority: 4,
    triggerCondition: 'always',
  });

  return blueprints;
}

// ── Proactive Kanban suggestions from intelligence ─────────────────────────────

function buildKanbanSuggestions(
  domain: DomainType,
  riskLevel: RiskLevel,
  signals: StaticSignals,
  regulations: string[]
): KanbanSuggestion[] {
  const suggestions: KanbanSuggestion[] = [];

  // Risk-based security suggestions
  if (riskLevel === 'critical' || riskLevel === 'high') {
    suggestions.push({
      title: '[Security Roadmap] Run full OWASP Top 10 audit',
      description: `This ${domain} application handles sensitive data (risk: ${riskLevel}). A structured OWASP Top 10 audit is mandatory before any production deployment.\n\n**Checklist:**\n- A01: Broken Access Control\n- A02: Cryptographic Failures\n- A03: Injection (SQL, XSS, SSTI)\n- A04: Insecure Design\n- A05: Security Misconfiguration\n- A06: Vulnerable Components\n- A07: Authentication Failures\n- A08: Data Integrity Failures\n- A09: Logging & Monitoring\n- A10: SSRF`,
      priority: 'critical',
      column: 'to-do',
      category: 'security',
      tags: ['owasp', 'security-audit', riskLevel],
    });
  }

  // Compliance suggestions
  if (regulations.includes('GDPR')) {
    suggestions.push({
      title: '[Compliance] GDPR compliance checklist',
      description: `Required for all applications processing EU personal data.\n\n**Actions needed:**\n- Implement cookie consent (CNIL-compliant)\n- Add data deletion / right to be forgotten\n- Create and test data export (Art. 20)\n- Add privacy policy page\n- Verify data retention periods are enforced\n- Document all data processors (third-party services)`,
      priority: 'high',
      column: 'backlog',
      category: 'compliance',
      tags: ['gdpr', 'legal', 'privacy'],
    });
  }

  if (regulations.includes('PCI-DSS')) {
    suggestions.push({
      title: '[Compliance] PCI-DSS — Payment security validation',
      description: `This application processes payments. PCI-DSS compliance is legally required.\n\n**Critical checks:**\n- No card data stored in plain text\n- No card numbers in URLs, logs, or error messages\n- HTTPS enforced on ALL payment-related pages\n- Strong cryptography for cardholder data transmission\n- Penetration test by approved scanning vendor (ASV)\n- Review PCI-DSS SAQ type required for your integration`,
      priority: 'critical',
      column: 'to-do',
      category: 'compliance',
      tags: ['pci-dss', 'payments', 'legal'],
    });
  }

  if (regulations.includes('HIPAA')) {
    suggestions.push({
      title: '[Compliance] HIPAA Security Rule — PHI protection audit',
      description: `This healthcare application handles Protected Health Information.\n\n**Required actions:**\n- Implement audit logging for all PHI access\n- Enforce MFA for all clinical staff accounts\n- Review Business Associate Agreements (BAA) with all vendors\n- Implement automatic session timeout (max 15 min idle)\n- Encrypt all PHI at rest and in transit\n- Conduct annual Security Risk Assessment (SRA)`,
      priority: 'critical',
      column: 'to-do',
      category: 'compliance',
      tags: ['hipaa', 'healthcare', 'phi', 'legal'],
    });
  }

  if (regulations.includes('WCAG 2.1 AA')) {
    suggestions.push({
      title: '[Improvement] Accessibility: WCAG 2.1 AA audit',
      description: `Legal requirement in EU, UK, Canada, and increasingly worldwide.\n\n**Key areas to test:**\n- All images have descriptive alt text\n- Full keyboard navigation (Tab, Enter, Escape)\n- Color contrast ratio ≥ 4.5:1 for normal text\n- Form fields have visible, associated labels\n- Error messages are announced by screen readers\n- Focus is never trapped\n- Videos have captions`,
      priority: regulations.includes('GDPR') ? 'high' : 'medium',
      column: 'backlog',
      category: 'compliance',
      tags: ['accessibility', 'wcag', 'a11y'],
    });
  }

  // Domain-specific improvement suggestions
  if (domain === 'fintech') {
    suggestions.push({
      title: '[Improvement] Add end-to-end payment flow monitoring',
      description: 'Implement real-time alerting when payment success rate drops below 99%. Consider synthetic monitoring that runs a test transaction every 5 minutes.\n\n**Recommended:** Stripe Radar rules review, payment webhook reliability test, refund flow test.',
      priority: 'high',
      column: 'backlog',
      category: 'improvement',
      tags: ['monitoring', 'payments', 'reliability'],
    });
  }

  if (domain === 'ecommerce') {
    suggestions.push({
      title: '[Performance] Cart & checkout flow performance budget',
      description: 'Every 100ms of checkout latency = 1% conversion rate loss (Shopify data).\n\n**Targets:**\n- Product page: LCP < 2.5s\n- Add to cart: response < 300ms\n- Checkout page: interactive in < 3s\n- Payment submission: feedback < 500ms\n\n**Actions:**\n- Image lazy loading and WebP format\n- Cart state managed client-side (no full page reload)\n- Critical CSS inlined',
      priority: 'high',
      column: 'backlog',
      category: 'performance',
      tags: ['performance', 'conversion', 'checkout'],
    });
  }

  // Universal improvement suggestions
  suggestions.push({
    title: '[Tech Debt] Implement automated regression test suite',
    description: `No automated regression suite detected. Every new feature risks breaking existing functionality.\n\n**Recommended minimum:**\n- Happy path E2E tests for all critical user flows\n- Smoke tests that run on every deployment\n- Visual regression tests for UI-heavy pages\n\n**Tools to consider:** Playwright (E2E), Percy (visual regression), k6 (load testing)`,
    priority: 'medium',
    column: 'backlog',
    category: 'tech-debt',
    tags: ['testing', 'ci-cd', 'regression'],
  });

  suggestions.push({
    title: '[Missing Test] Error boundary and fallback UI coverage',
    description: 'What happens when the backend is down? When an API returns 500? When the network is slow?\n\n**Tests to add:**\n- Simulate API failure → verify graceful error message (not blank page)\n- Simulate network timeout → verify loading state does not hang forever\n- Test 503 / maintenance mode page\n- Verify error is logged to monitoring (Sentry, Datadog)',
    priority: 'medium',
    column: 'backlog',
    category: 'missing-test',
    tags: ['error-handling', 'resilience', 'ux'],
  });

  return suggestions;
}

// ── Main analyzer class ────────────────────────────────────────────────────────

export class ProjectIntelligenceAnalyzer {
  /**
   * Full intelligence analysis.
   * Call this BEFORE runAutonomously().
   * The result shapes the entire testing strategy.
   */
  async analyze(
    url: string,
    options: {
      repoUrl?: string;
      repoPath?: string;
      appName?: string;
      appDescription?: string;
    } = {}
  ): Promise<ProjectIntelligence> {
    const signals = detectStaticSignals(url, options.repoPath);
    const { domain, riskLevel, regulations } = deriveRuleBasedContext(signals);

    const mandatoryChecks = [
      ...(DOMAIN_MANDATORY_CHECKS[domain] || []),
      ...DOMAIN_MANDATORY_CHECKS.default,
    ];

    const suggestedSpecialists = selectSpecialists(domain, riskLevel, signals);
    const dynamicAgentBlueprints = buildDynamicAgentBlueprints(domain, signals, url);
    const kanbanSuggestions = buildKanbanSuggestions(domain, riskLevel, signals, regulations);

    const testingStrategy = buildTestingStrategy(domain, riskLevel, signals);

    const criticalPaths = buildCriticalPaths(domain, signals, url);

    const reasoning = buildReasoning(domain, riskLevel, regulations, signals, mandatoryChecks);

    return {
      domain,
      riskLevel,
      regulatoryContext: regulations,
      criticalPaths,
      mandatoryChecks,
      suggestedSpecialists,
      dynamicAgentBlueprints,
      testingStrategy,
      kanbanSuggestions,
      techStackSignals: signals.keywords,
      reasoning,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildTestingStrategy(domain: DomainType, riskLevel: RiskLevel, signals: StaticSignals): TestingStrategy {
  const depthMap: Record<RiskLevel, TestingStrategy['depth']> = {
    critical: 'exhaustive',
    high: 'thorough',
    medium: 'standard',
    low: 'basic',
  };

  const requiredTestTypes: TestingStrategy['requiredTestTypes'] = ['functional', 'e2e'];

  if (riskLevel === 'critical' || riskLevel === 'high') {
    requiredTestTypes.push('security', 'regression');
  }
  if (domain === 'government' || domain === 'healthcare' || domain === 'education') {
    requiredTestTypes.push('accessibility');
  }
  if (domain === 'ecommerce' || domain === 'fintech') {
    requiredTestTypes.push('performance');
  }

  return {
    depth: depthMap[riskLevel],
    primaryFocus: getPrimaryFocus(domain, signals),
    secondaryFocus: getSecondaryFocus(domain),
    requiredTestTypes: [...new Set(requiredTestTypes)],
    estimatedSessionMinutes: { critical: 90, high: 60, medium: 40, low: 20 }[riskLevel],
  };
}

function getPrimaryFocus(domain: DomainType, signals: StaticSignals): string[] {
  const focus: string[] = [];
  if (signals.hasAuth) focus.push('Authentication & session management');
  if (signals.hasPayments) focus.push('Payment flow & financial data integrity');
  if (signals.hasHealthData) focus.push('PHI protection & HIPAA controls');
  if (signals.hasAdmin) focus.push('RBAC & privilege escalation prevention');
  if (signals.hasFileUpload) focus.push('File upload security');
  if (domain === 'ecommerce') focus.push('Cart & checkout flow', 'Inventory integrity');
  if (domain === 'developer-tools') focus.push('API authentication & rate limiting');
  focus.push('Core user flows (happy path)');
  return focus;
}

function getSecondaryFocus(domain: DomainType): string[] {
  return [
    'Navigation & broken links',
    'Form validation & error messages',
    'Responsive layout',
    'Accessibility (keyboard navigation)',
    'Page load performance',
  ];
}

function buildCriticalPaths(domain: DomainType, signals: StaticSignals, url: string): string[] {
  const paths: string[] = [];
  if (signals.hasAuth) paths.push('User registration → email verification → first login');
  if (signals.hasAuth) paths.push('Login with valid credentials → dashboard access');
  if (signals.hasAuth) paths.push('Password reset → receive email → reset → login with new password');
  if (signals.hasPayments) paths.push('Select plan → fill payment form → receive confirmation email');
  if (domain === 'ecommerce') paths.push('Search product → add to cart → checkout → order confirmation');
  if (signals.hasAdmin) paths.push('Admin login → access user management → perform admin action');
  if (signals.hasFileUpload) paths.push('Upload file → processing → file available/downloadable');
  if (domain === 'developer-tools') paths.push('Generate API key → make authenticated API call → get expected response');
  paths.push('Homepage → primary CTA → completion');
  return paths;
}

function buildReasoning(
  domain: DomainType,
  riskLevel: RiskLevel,
  regulations: string[],
  signals: StaticSignals,
  checks: MandatoryCheck[]
): string {
  const lines: string[] = [
    `## Project Intelligence Report`,
    ``,
    `**Domain detected**: ${domain} | **Risk level**: ${riskLevel.toUpperCase()}`,
    `**Regulatory context**: ${regulations.join(', ') || 'None identified'}`,
    ``,
    `### Why this risk level?`,
  ];

  if (signals.hasPayments) lines.push('- Processes financial transactions → PCI-DSS scope, any vulnerability has direct monetary impact');
  if (signals.hasHealthData) lines.push('- Handles patient/health data → HIPAA mandatory, breaches trigger regulatory fines and patient harm');
  if (signals.hasAdmin) lines.push('- Administrative interface → privilege escalation could expose ALL user data');
  if (signals.hasAuth) lines.push('- User authentication present → session management and credential security are critical');
  if (signals.hasFileUpload) lines.push('- File upload functionality → classic attack surface for RCE and stored XSS');

  lines.push('', `### Testing approach`);
  lines.push(`${checks.length} mandatory checks identified. ${checks.filter(c => c.priority === 'critical').length} are critical and block release.`);
  lines.push(`Specialists selected based on detected signals — not generic defaults.`);
  lines.push(`${signals.keywords.length > 0 ? `Detected signals: ${signals.keywords.slice(0, 8).join(', ')}` : 'No specific signals detected — applying standard testing profile.'}`);

  return lines.join('\n');
}
