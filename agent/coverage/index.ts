import { OpenQADatabase } from '../../database/index.js';

export interface CoverageEntry {
  url: string;
  method: string;
  tested: boolean;
  lastTestedAt?: string;
  testCount: number;
}

export interface CoverageReport {
  total: number;
  tested: number;
  untested: number;
  coveragePercent: number;
  entries: CoverageEntry[];
}

export class CoverageTracker {
  private routes = new Map<string, CoverageEntry>();

  /**
   * Register a known route (from code analysis or sitemap)
   */
  registerRoute(method: string, url: string): void {
    const key = `${method.toUpperCase()} ${url}`;
    if (!this.routes.has(key)) {
      this.routes.set(key, { url, method: method.toUpperCase(), tested: false, testCount: 0 });
    }
  }

  /**
   * Record that a route was exercised during a test session
   */
  recordTest(method: string, url: string): void {
    const key = `${method.toUpperCase()} ${url}`;
    const existing = this.routes.get(key);
    if (existing) {
      existing.tested = true;
      existing.lastTestedAt = new Date().toISOString();
      existing.testCount++;
    } else {
      this.routes.set(key, {
        url,
        method: method.toUpperCase(),
        tested: true,
        lastTestedAt: new Date().toISOString(),
        testCount: 1,
      });
    }
  }

  /**
   * Build a coverage report
   */
  getReport(): CoverageReport {
    const entries = Array.from(this.routes.values());
    const tested = entries.filter(e => e.tested).length;
    const total = entries.length;

    return {
      total,
      tested,
      untested: total - tested,
      coveragePercent: total === 0 ? 0 : Math.round((tested / total) * 100),
      entries: entries.sort((a, b) => (a.tested === b.tested ? 0 : a.tested ? 1 : -1)),
    };
  }

  /**
   * Populate routes from an OpenAPI-style spec or action history
   */
  async loadFromDatabase(db: OpenQADatabase, sessionId: string): Promise<void> {
    const actions = await db.getSessionActions(sessionId);
    for (const action of actions) {
      if (action.type === 'navigate' || action.type === 'api_call' || action.type === 'request') {
        // Extract method + URL from description or input
        const urlMatch = (action.input || action.description).match(/(GET|POST|PUT|DELETE|PATCH|HEAD)\s+(https?:\/\/[^\s]+|\/[^\s]*)/i);
        if (urlMatch) {
          this.recordTest(urlMatch[1], urlMatch[2]);
        } else {
          // Treat navigate descriptions as GET
          const simpleUrl = (action.input || '').match(/https?:\/\/[^\s]+/);
          if (simpleUrl) {
            this.recordTest('GET', simpleUrl[0]);
          }
        }
      }
    }
  }

  reset(): void {
    this.routes.clear();
  }
}
