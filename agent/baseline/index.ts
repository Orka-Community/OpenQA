/**
 * BaselineComparator
 *
 * After a session completes, compares its bugs with the previous session
 * for the same target URL to detect regressions and improvements.
 */

import type { OpenQADatabase } from '../../database/index.js';

export interface BaselineReport {
  previousSessionId?: string;
  newBugs: number;
  fixedBugs: number;
  regressions: string[];   // titles of new bugs not seen before
  improvements: string[];  // titles of bugs that disappeared
  summary: string;
}

export class BaselineComparator {
  constructor(private db: OpenQADatabase) {}

  async compare(currentSessionId: string): Promise<BaselineReport> {
    // Get current session bugs
    const currentBugs = await this.db.getSessionBugs(currentSessionId);

    // Find the previous session (completed, before current)
    const sessions = await this.db.getRecentSessions(10);
    const previousSession = sessions.find(
      s => s.id !== currentSessionId && s.status === 'completed'
    );

    if (!previousSession) {
      return {
        newBugs: currentBugs.length,
        fixedBugs: 0,
        regressions: currentBugs.map(b => b.title),
        improvements: [],
        summary: `First session — ${currentBugs.length} issue(s) found, no baseline to compare with.`,
      };
    }

    const previousBugs = await this.db.getSessionBugs(previousSession.id);

    // Normalize titles for comparison
    const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const prevTitles = new Set(previousBugs.map(b => normalize(b.title)));
    const currTitles = new Set(currentBugs.map(b => normalize(b.title)));

    const regressions = currentBugs
      .filter(b => !prevTitles.has(normalize(b.title)))
      .map(b => b.title);

    const improvements = previousBugs
      .filter(b => !currTitles.has(normalize(b.title)))
      .map(b => b.title);

    const report: BaselineReport = {
      previousSessionId: previousSession.id,
      newBugs: regressions.length,
      fixedBugs: improvements.length,
      regressions,
      improvements,
      summary: this.buildSummary(regressions, improvements, previousSession.id),
    };

    // Persist baseline
    this.db.createBaseline({
      session_id: currentSessionId,
      previous_session_id: previousSession.id,
      new_bugs: regressions.length,
      fixed_bugs: improvements.length,
      regression_titles: regressions,
      improvement_titles: improvements,
    });

    return report;
  }

  private buildSummary(regressions: string[], improvements: string[], prevId: string): string {
    const parts: string[] = [`Compared with session ${prevId.slice(-8)}:`];
    if (regressions.length === 0 && improvements.length === 0) {
      parts.push('No change — same issues as before.');
    }
    if (regressions.length > 0) {
      parts.push(`🔴 ${regressions.length} new regression(s): ${regressions.slice(0, 3).join(', ')}${regressions.length > 3 ? '…' : ''}`);
    }
    if (improvements.length > 0) {
      parts.push(`✅ ${improvements.length} issue(s) resolved since last run.`);
    }
    return parts.join(' ');
  }
}
