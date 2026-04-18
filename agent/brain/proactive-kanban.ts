/**
 * ProactiveKanbanManager
 *
 * Converts ProjectIntelligence findings into real Kanban tickets automatically,
 * BEFORE the agent starts testing. A senior QA engineer would do this on day-one:
 * read the codebase/URL, understand the risk profile, and immediately open tickets
 * for every known risk area — not wait for bugs to surface.
 *
 * Responsibilities:
 *   1. Seed the Kanban with strategic tasks derived from ProjectIntelligence
 *   2. Record agent findings as actionable tickets during a session
 *   3. Deduplicate (avoid re-opening tickets that already exist)
 *   4. Categorise tickets correctly (security, compliance, performance, …)
 *   5. Produce a prioritised roadmap summary
 */

import type { OpenQADatabase, KanbanTicket } from '../../database/index.js';
import type { ProjectIntelligence, KanbanSuggestion, RiskLevel } from '../intelligence/index.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KanbanFinding {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  sessionId?: string;
  bugId?: string;
  evidence?: string;    // screenshot URL or log excerpt
}

export interface KanbanRoadmap {
  totalTickets: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  securityTickets: string[];
  complianceTickets: string[];
  improvementTickets: string[];
  summary: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapSeverityToPriority(
  severity: 'critical' | 'high' | 'medium' | 'low',
): KanbanTicket['priority'] {
  return severity as KanbanTicket['priority'];
}

function mapCategoryToType(
  category: KanbanSuggestion['category'],
): KanbanTicket['type'] {
  switch (category) {
    case 'security':
    case 'compliance':
      return 'task';
    case 'improvement':
    case 'performance':
      return 'improvement';
    case 'tech-debt':
      return 'task';
    case 'missing-test':
      return 'task';
    default:
      return 'task';
  }
}

function normaliseTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── ProactiveKanbanManager ─────────────────────────────────────────────────────

export class ProactiveKanbanManager {
  private db: OpenQADatabase;
  private seededTitles: Set<string> = new Set();

  constructor(db: OpenQADatabase) {
    this.db = db;
  }

  /**
   * Load the normalised titles of all existing tickets into memory
   * so we can skip duplicates when seeding.
   */
  async loadExistingTitles(): Promise<void> {
    const existing = await this.db.getKanbanTickets();
    for (const t of existing) {
      this.seededTitles.add(normaliseTitle(t.title));
    }
  }

  /**
   * Seed the Kanban board from a ProjectIntelligence analysis.
   * Returns the list of tickets that were actually created (skips duplicates).
   */
  async seedFromIntelligence(intel: ProjectIntelligence): Promise<KanbanTicket[]> {
    // If the intelligence layer couldn't identify the domain, skip seeding entirely.
    // Generic default tickets would look like fabricated noise to the user.
    if (intel.domain === 'unknown') return [];

    await this.loadExistingTitles();
    const created: KanbanTicket[] = [];

    // 1. Mandatory check tickets (highest priority — these block release)
    for (const check of intel.mandatoryChecks) {
      const title = `[${check.category.toUpperCase()}] ${check.name}`;
      if (this.seededTitles.has(normaliseTitle(title))) continue;

      const tags: string[] = [check.category, check.priority];
      if (check.owaspRef) tags.push(check.owaspRef);

      const ticket = await this.db.createKanbanTicket({
        title,
        description: `${check.reason}\n\n${check.owaspRef ? `Reference: ${check.owaspRef}` : ''}`.trim(),
        type: 'task',
        priority: mapSeverityToPriority(check.priority),
        column: check.priority === 'critical' ? 'to-do' : 'backlog',
        tags: tags.join(','),
      });

      created.push(ticket);
      this.seededTitles.add(normaliseTitle(title));
    }

    // 2. KanbanSuggestion tickets (improvement / tech-debt / missing-test)
    for (const suggestion of intel.kanbanSuggestions) {
      const title = suggestion.title;
      if (this.seededTitles.has(normaliseTitle(title))) continue;

      const ticket = await this.db.createKanbanTicket({
        title,
        description: suggestion.description,
        type: mapCategoryToType(suggestion.category),
        priority: mapSeverityToPriority(suggestion.priority),
        column: suggestion.column,
        tags: suggestion.tags.join(','),
      });

      created.push(ticket);
      this.seededTitles.add(normaliseTitle(title));
    }

    // 3. One meta-ticket describing the testing strategy
    const stratTitle = `QA Strategy: ${intel.domain} (${intel.riskLevel} risk)`;
    if (!this.seededTitles.has(normaliseTitle(stratTitle))) {
      const stratDesc = [
        `**Domain**: ${intel.domain}`,
        `**Risk level**: ${intel.riskLevel}`,
        `**Regulatory context**: ${intel.regulatoryContext.join(', ') || 'None'}`,
        `**Testing depth**: ${intel.testingStrategy.depth}`,
        ``,
        `**Primary focus**:`,
        ...intel.testingStrategy.primaryFocus.map(f => `- ${f}`),
        ``,
        `**Critical paths to cover**:`,
        ...intel.criticalPaths.map(p => `- ${p}`),
        ``,
        `Estimated session: ${intel.testingStrategy.estimatedSessionMinutes} min`,
      ].join('\n');

      const stratTicket = await this.db.createKanbanTicket({
        title: stratTitle,
        description: stratDesc,
        type: 'task',
        priority: 'high',
        column: 'to-do',
        tags: 'strategy,meta,qa-plan',
      });
      created.push(stratTicket);
      this.seededTitles.add(normaliseTitle(stratTitle));
    }

    return created;
  }

  /**
   * Record a live finding from the agent as a Kanban ticket.
   * Call this whenever the agent detects a bug or improvement opportunity.
   */
  async recordFinding(finding: KanbanFinding): Promise<KanbanTicket | null> {
    if (this.seededTitles.has(normaliseTitle(finding.title))) return null;

    const descParts = [finding.description];
    if (finding.evidence) descParts.push(`\n**Evidence**: ${finding.evidence}`);
    if (finding.sessionId) descParts.push(`\n**Session**: ${finding.sessionId}`);

    const priority = mapSeverityToPriority(finding.severity);
    const ticket = await this.db.createKanbanTicket({
      title: finding.title,
      description: descParts.join(''),
      type: 'bug',
      priority,
      column: finding.severity === 'critical' || finding.severity === 'high' ? 'to-do' : 'backlog',
      tags: `finding,${finding.category},${finding.severity}`,
      bug_id: finding.bugId,
      screenshot_url: finding.evidence?.startsWith('http') ? finding.evidence : undefined,
    });

    this.seededTitles.add(normaliseTitle(finding.title));
    return ticket;
  }

  /**
   * Build a prioritised roadmap summary from the current Kanban board.
   */
  async buildRoadmap(): Promise<KanbanRoadmap> {
    const tickets = await this.db.getKanbanTickets();

    const criticalCount = tickets.filter(t => t.priority === 'critical').length;
    const highCount     = tickets.filter(t => t.priority === 'high').length;
    const mediumCount   = tickets.filter(t => t.priority === 'medium').length;
    const lowCount      = tickets.filter(t => t.priority === 'low').length;

    const securityTickets  = tickets.filter(t => t.tags?.includes('security')).map(t => t.title);
    const complianceTickets = tickets.filter(t => t.tags?.includes('compliance')).map(t => t.title);
    const improvementTickets = tickets.filter(t => t.type === 'improvement').map(t => t.title);

    const summary = [
      `## QA Roadmap`,
      ``,
      `Total open tickets: ${tickets.length}`,
      `🔴 Critical: ${criticalCount} | 🟠 High: ${highCount} | 🟡 Medium: ${mediumCount} | 🟢 Low: ${lowCount}`,
      ``,
      criticalCount > 0
        ? `⚠️  ${criticalCount} critical issue(s) block release — must be resolved first.`
        : `✅  No critical blockers identified.`,
      ``,
      securityTickets.length > 0
        ? `**Security tasks** (${securityTickets.length}): ${securityTickets.slice(0, 3).join(', ')}${securityTickets.length > 3 ? '…' : ''}`
        : '',
      complianceTickets.length > 0
        ? `**Compliance tasks** (${complianceTickets.length}): ${complianceTickets.slice(0, 3).join(', ')}${complianceTickets.length > 3 ? '…' : ''}`
        : '',
    ].filter(Boolean).join('\n');

    return {
      totalTickets: tickets.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      securityTickets,
      complianceTickets,
      improvementTickets,
      summary,
    };
  }

  /**
   * Returns true if a ticket with this title (normalised) is already on the board.
   */
  isDuplicate(title: string): boolean {
    return this.seededTitles.has(normaliseTitle(title));
  }

  /**
   * After specialists finish, move the corresponding seeded Kanban tickets
   * to the correct column based on their result.
   *
   * Mapping:
   *   specialist started  → in-progress (first time only)
   *   specialist completed → done
   *   specialist failed    → to-do (needs human attention)
   */
  async syncWithSpecialistResults(
    statuses: Array<{ type: string; status: 'idle' | 'running' | 'completed' | 'failed' }>
  ): Promise<void> {
    if (statuses.length === 0) return;

    const tickets = await this.db.getKanbanTickets();

    // Map specialist type → relevant tag keywords
    const tagMap: Record<string, string[]> = {
      'security-scanner':        ['security', 'owasp'],
      'sql-injection':           ['security', 'owasp'],
      'xss-tester':              ['security', 'owasp'],
      'auth-tester':             ['security', 'owasp'],
      'github-security-auditor': ['security', 'owasp'],
      'accessibility-tester':    ['accessibility', 'wcag'],
      'performance-tester':      ['performance'],
      'form-tester':             ['forms', 'functional'],
      'component-tester':        ['ui', 'ux', 'improvement'],
      'api-tester':              ['api', 'security'],
      'navigation-tester':       ['functional'],
      'github-code-reviewer':    ['tech-debt', 'improvement', 'missing-test'],
      'github-issue-analyzer':   ['strategy', 'meta'],
    };

    for (const status of statuses) {
      if (status.status === 'idle' || status.status === 'running') continue;

      const baseType = status.type.startsWith('dynamic:') ? '' : status.type;
      const relevantTags = (tagMap[baseType] || []);

      if (relevantTags.length === 0) continue;

      const targetColumn: KanbanTicket['column'] = status.status === 'completed' ? 'done' : 'to-do';

      for (const ticket of tickets) {
        // Only update tickets that are still in their initial seeded columns
        if (ticket.column === 'done' || ticket.column === 'in-progress') continue;

        const ticketTags = (ticket.tags || '').split(',').map(t => t.trim().toLowerCase());
        const matches = relevantTags.some(tag => ticketTags.includes(tag));
        if (!matches) continue;

        await this.db.updateKanbanTicket(ticket.id, { column: targetColumn });
      }
    }
  }
}
