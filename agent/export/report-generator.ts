import { OpenQADatabase } from '../../database/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ReportMetrics {
  // Performance
  totalActions: number;
  totalDuration: number;
  averageActionTime: number;
  
  // Quality
  bugsFound: number;
  criticalBugs: number;
  highBugs: number;
  mediumBugs: number;
  lowBugs: number;
  
  // Coverage
  pagesVisited: number;
  formsTestedCount: number;
  apiEndpointsTested: number;
  
  // Specialists
  specialistsRun: number;
  specialistFindings: Record<string, number>;
  
  // Success metrics
  successRate: number;
  testsPassed: number;
  testsFailed: number;
}

export interface ReportSection {
  title: string;
  score: number; // 0-100
  status: 'pass' | 'warning' | 'fail';
  metrics: Array<{ label: string; value: string | number; status?: 'good' | 'warning' | 'bad' }>;
  details?: string;
  recommendations?: string[];
}

export interface QAReport {
  sessionId: string;
  applicationName: string;
  applicationUrl: string;
  timestamp: Date;
  duration: number;
  
  // Overall score (0-100)
  overallScore: number;
  
  // Sections
  sections: {
    security: ReportSection;
    functionality: ReportSection;
    performance: ReportSection;
    accessibility: ReportSection;
    coverage: ReportSection;
  };
  
  // Detailed metrics
  metrics: ReportMetrics;
  
  // Bugs list
  bugs: Array<{
    id: string;
    title: string;
    severity: string;
    description: string;
    foundBy: string;
    githubUrl?: string;
  }>;
  
  // Actions timeline
  actions: Array<{
    timestamp: Date;
    type: string;
    description: string;
    specialist?: string;
  }>;
}

export class ReportGenerator {
  private db: OpenQADatabase;
  private reportsDir: string = './data/reports';

  constructor(db: OpenQADatabase) {
    this.db = db;
    mkdirSync(this.reportsDir, { recursive: true });
  }

  async generateReport(sessionId: string): Promise<QAReport> {
    const session = await this.db.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const actions = await this.db.getSessionActions(sessionId);
    const bugs = await this.db.getAllBugs();
    const sessionBugs = bugs.filter(b => b.session_id === sessionId);

    // Calculate metrics
    const metrics = this.calculateMetrics(session, actions, sessionBugs);
    
    // Generate sections
    const sections = this.generateSections(metrics, sessionBugs, actions);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(sections);

    // Parse metadata if available
    let metadata: any = {};
    try {
      metadata = session.metadata ? JSON.parse(session.metadata) : {};
    } catch (e) {
      // Invalid JSON, use empty object
    }

    const report: QAReport = {
      sessionId: session.id,
      applicationName: metadata.appName || 'Application',
      applicationUrl: metadata.appUrl || '',
      timestamp: new Date(session.started_at),
      duration: session.ended_at 
        ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
        : Date.now() - new Date(session.started_at).getTime(),
      overallScore,
      sections,
      metrics,
      bugs: sessionBugs.map(bug => ({
        id: bug.id,
        title: bug.title,
        severity: bug.severity,
        description: bug.description,
        foundBy: this.extractSpecialistFromBug(bug),
        githubUrl: bug.github_issue_url
      })),
      actions: actions.slice(-50).map(action => ({
        timestamp: new Date(action.timestamp),
        type: action.type || 'unknown',
        description: action.description,
        specialist: this.extractSpecialistFromAction(action.type || '')
      }))
    };

    return report;
  }

  private calculateMetrics(session: any, actions: any[], bugs: any[]): ReportMetrics {
    const specialistActions = actions.filter(a => a.type?.startsWith('specialist:'));
    const specialistFindings: Record<string, number> = {};
    
    specialistActions.forEach(action => {
      const parts = action.type!.split(':');
      if (parts.length >= 2) {
        const type = parts[1];
        specialistFindings[type] = (specialistFindings[type] || 0) + 1;
      }
    });

    const duration = session.ended_at 
      ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
      : Date.now() - new Date(session.started_at).getTime();

    return {
      totalActions: session.total_actions || 0,
      totalDuration: duration,
      averageActionTime: actions.length > 0 ? duration / actions.length : 0,
      
      bugsFound: bugs.length,
      criticalBugs: bugs.filter(b => b.severity === 'critical').length,
      highBugs: bugs.filter(b => b.severity === 'high').length,
      mediumBugs: bugs.filter(b => b.severity === 'medium').length,
      lowBugs: bugs.filter(b => b.severity === 'low').length,
      
      pagesVisited: actions.filter(a => a.type === 'navigate' || a.type?.includes('navigate')).length,
      formsTestedCount: actions.filter(a => a.type?.includes('form') || a.type?.includes('fill')).length,
      apiEndpointsTested: actions.filter(a => a.type?.includes('api')).length,
      
      specialistsRun: Object.keys(specialistFindings).length,
      specialistFindings,
      
      successRate: session.total_actions > 0 
        ? Math.round(((session.total_actions - bugs.length) / session.total_actions) * 100)
        : 100,
      testsPassed: session.total_actions - bugs.length,
      testsFailed: bugs.length
    };
  }

  private generateSections(metrics: ReportMetrics, bugs: any[], actions: any[]): QAReport['sections'] {
    return {
      security: this.generateSecuritySection(metrics, bugs),
      functionality: this.generateFunctionalitySection(metrics, bugs),
      performance: this.generatePerformanceSection(metrics, actions),
      accessibility: this.generateAccessibilitySection(metrics, bugs),
      coverage: this.generateCoverageSection(metrics, actions)
    };
  }

  private generateSecuritySection(metrics: ReportMetrics, bugs: any[]): ReportSection {
    const securityBugs = bugs.filter(b => 
      b.title.toLowerCase().includes('xss') ||
      b.title.toLowerCase().includes('sql') ||
      b.title.toLowerCase().includes('https') ||
      b.title.toLowerCase().includes('security')
    );

    const criticalSecurityBugs = securityBugs.filter(b => b.severity === 'critical').length;
    const score = criticalSecurityBugs === 0 ? (securityBugs.length === 0 ? 100 : 80) : 40;

    return {
      title: 'Security',
      score,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      metrics: [
        { label: 'Critical vulnerabilities', value: criticalSecurityBugs, status: criticalSecurityBugs === 0 ? 'good' : 'bad' },
        { label: 'High severity issues', value: metrics.highBugs, status: metrics.highBugs === 0 ? 'good' : 'warning' },
        { label: 'Security tests run', value: metrics.specialistFindings['security-scanner'] || 0, status: 'good' }
      ],
      details: securityBugs.length > 0 
        ? `Found ${securityBugs.length} security issue(s) that need attention.`
        : 'No security vulnerabilities detected.',
      recommendations: criticalSecurityBugs > 0 
        ? ['Fix critical security vulnerabilities immediately', 'Review authentication mechanisms', 'Enable HTTPS']
        : []
    };
  }

  private generateFunctionalitySection(metrics: ReportMetrics, bugs: any[]): ReportSection {
    const functionalBugs = bugs.filter(b => 
      !b.title.toLowerCase().includes('security') &&
      !b.title.toLowerCase().includes('performance')
    );

    const score = Math.max(0, 100 - (functionalBugs.length * 10));

    return {
      title: 'Functionality',
      score,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      metrics: [
        { label: 'Total bugs found', value: functionalBugs.length, status: functionalBugs.length === 0 ? 'good' : 'warning' },
        { label: 'Forms tested', value: metrics.formsTestedCount, status: 'good' },
        { label: 'Success rate', value: `${metrics.successRate}%`, status: metrics.successRate >= 90 ? 'good' : 'warning' }
      ],
      details: `Tested ${metrics.totalActions} actions with ${metrics.successRate}% success rate.`,
      recommendations: functionalBugs.length > 0 
        ? ['Review and fix reported bugs', 'Add more comprehensive test coverage']
        : ['Maintain current quality standards']
    };
  }

  private generatePerformanceSection(metrics: ReportMetrics, actions: any[]): ReportSection {
    const avgTime = metrics.averageActionTime / 1000; // Convert to seconds
    const score = avgTime < 2 ? 100 : avgTime < 5 ? 80 : 60;

    return {
      title: 'Performance',
      score,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      metrics: [
        { label: 'Total duration', value: `${(metrics.totalDuration / 1000 / 60).toFixed(1)}m`, status: 'good' },
        { label: 'Average action time', value: `${avgTime.toFixed(2)}s`, status: avgTime < 2 ? 'good' : 'warning' },
        { label: 'Total actions', value: metrics.totalActions, status: 'good' }
      ],
      details: `Session completed in ${(metrics.totalDuration / 1000 / 60).toFixed(1)} minutes.`,
      recommendations: avgTime > 3 
        ? ['Optimize page load times', 'Review slow operations']
        : []
    };
  }

  private generateAccessibilitySection(metrics: ReportMetrics, bugs: any[]): ReportSection {
    const a11yBugs = bugs.filter(b => 
      b.title.toLowerCase().includes('accessibility') ||
      b.title.toLowerCase().includes('a11y') ||
      b.title.toLowerCase().includes('aria')
    );

    const score = a11yBugs.length === 0 ? 90 : 70;

    return {
      title: 'Accessibility',
      score,
      status: score >= 80 ? 'pass' : 'warning',
      metrics: [
        { label: 'Accessibility issues', value: a11yBugs.length, status: a11yBugs.length === 0 ? 'good' : 'warning' },
        { label: 'WCAG compliance', value: a11yBugs.length === 0 ? 'Pass' : 'Review needed', status: a11yBugs.length === 0 ? 'good' : 'warning' }
      ],
      details: a11yBugs.length === 0 
        ? 'No accessibility issues detected.'
        : `Found ${a11yBugs.length} accessibility issue(s).`,
      recommendations: a11yBugs.length > 0 
        ? ['Add ARIA labels', 'Improve keyboard navigation', 'Test with screen readers']
        : []
    };
  }

  private generateCoverageSection(metrics: ReportMetrics, actions: any[]): ReportSection {
    const coverageScore = Math.min(100, (metrics.pagesVisited * 10) + (metrics.specialistsRun * 15));

    return {
      title: 'Test Coverage',
      score: coverageScore,
      status: coverageScore >= 80 ? 'pass' : coverageScore >= 60 ? 'warning' : 'fail',
      metrics: [
        { label: 'Pages visited', value: metrics.pagesVisited, status: 'good' },
        { label: 'Specialists run', value: metrics.specialistsRun, status: metrics.specialistsRun >= 3 ? 'good' : 'warning' },
        { label: 'Forms tested', value: metrics.formsTestedCount, status: 'good' },
        { label: 'API endpoints', value: metrics.apiEndpointsTested, status: 'good' }
      ],
      details: `Covered ${metrics.pagesVisited} pages with ${metrics.specialistsRun} specialist agents.`,
      recommendations: coverageScore < 80 
        ? ['Increase test coverage', 'Add more specialist agents', 'Test more user flows']
        : []
    };
  }

  private calculateOverallScore(sections: QAReport['sections']): number {
    const weights = {
      security: 0.30,
      functionality: 0.25,
      performance: 0.15,
      accessibility: 0.15,
      coverage: 0.15
    };

    return Math.round(
      sections.security.score * weights.security +
      sections.functionality.score * weights.functionality +
      sections.performance.score * weights.performance +
      sections.accessibility.score * weights.accessibility +
      sections.coverage.score * weights.coverage
    );
  }

  private extractSpecialistFromAction(actionType: string): string | undefined {
    if (actionType.startsWith('specialist:')) {
      const parts = actionType.split(':');
      return parts[1];
    }
    return undefined;
  }

  private extractSpecialistFromBug(bug: any): string {
    // Try to infer from description or default to 'automated'
    return 'automated-qa';
  }

  async exportHTML(report: QAReport): Promise<string> {
    const html = this.generateHTML(report);
    const filename = `report-${report.sessionId}-${Date.now()}.html`;
    const filepath = join(this.reportsDir, filename);
    
    writeFileSync(filepath, html, 'utf-8');
    return filepath;
  }

  async exportJSON(report: QAReport): Promise<string> {
    const filename = `report-${report.sessionId}-${Date.now()}.json`;
    const filepath = join(this.reportsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    return filepath;
  }

  private generateHTML(report: QAReport): string {
    const scoreColor = (score: number) => {
      if (score >= 90) return '#0cce6b';
      if (score >= 75) return '#ffa400';
      if (score >= 50) return '#ff4e42';
      return '#ff0000';
    };

    const statusBadge = (status: string) => {
      const colors = {
        pass: '#0cce6b',
        warning: '#ffa400',
        fail: '#ff4e42'
      };
      return `<span style="background: ${colors[status as keyof typeof colors]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${status.toUpperCase()}</span>`;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA Report - ${report.applicationName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      border-radius: 16px;
      margin-bottom: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 36px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    .header .meta {
      opacity: 0.9;
      font-size: 14px;
    }
    .score-circle {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
      font-weight: 700;
      margin: 30px auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }
    .sections {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .section:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .section-score {
      font-size: 32px;
      font-weight: 700;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .metric:last-child { border-bottom: none; }
    .metric-label {
      color: #666;
      font-size: 14px;
    }
    .metric-value {
      font-weight: 600;
      font-size: 14px;
    }
    .metric-value.good { color: #0cce6b; }
    .metric-value.warning { color: #ffa400; }
    .metric-value.bad { color: #ff4e42; }
    .recommendations {
      background: #fff9e6;
      border-left: 4px solid #ffa400;
      padding: 16px;
      margin-top: 16px;
      border-radius: 4px;
    }
    .recommendations h4 {
      font-size: 14px;
      margin-bottom: 8px;
      color: #cc8400;
    }
    .recommendations ul {
      list-style: none;
      padding-left: 0;
    }
    .recommendations li {
      padding: 4px 0;
      font-size: 13px;
      color: #666;
    }
    .recommendations li:before {
      content: "→ ";
      color: #ffa400;
      font-weight: bold;
    }
    .bugs-section {
      background: white;
      border-radius: 12px;
      padding: 28px;
      margin-bottom: 40px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .bug-item {
      padding: 16px;
      border-left: 4px solid #ff4e42;
      background: #fff5f5;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .bug-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .bug-severity {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-right: 8px;
    }
    .severity-critical { background: #ff0000; color: white; }
    .severity-high { background: #ff4e42; color: white; }
    .severity-medium { background: #ffa400; color: white; }
    .severity-low { background: #0cce6b; color: white; }
    .footer {
      text-align: center;
      padding: 40px 20px;
      color: #999;
      font-size: 14px;
    }
    @media print {
      body { background: white; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 OpenQA Quality Report</h1>
      <div class="meta">
        <div><strong>Application:</strong> ${report.applicationName}</div>
        <div><strong>URL:</strong> ${report.applicationUrl}</div>
        <div><strong>Session:</strong> ${report.sessionId}</div>
        <div><strong>Date:</strong> ${report.timestamp.toLocaleString()}</div>
        <div><strong>Duration:</strong> ${(report.duration / 1000 / 60).toFixed(1)} minutes</div>
      </div>
      <div class="score-circle" style="color: ${scoreColor(report.overallScore)}">
        ${report.overallScore}
      </div>
      <div style="text-align: center; font-size: 18px; font-weight: 600;">Overall Quality Score</div>
    </div>

    <div class="sections">
      ${Object.entries(report.sections).map(([key, section]) => `
        <div class="section">
          <div class="section-header">
            <div class="section-title">${section.title}</div>
            <div class="section-score" style="color: ${scoreColor(section.score)}">${section.score}</div>
          </div>
          <div style="margin-bottom: 16px;">${statusBadge(section.status)}</div>
          ${section.metrics.map(m => `
            <div class="metric">
              <span class="metric-label">${m.label}</span>
              <span class="metric-value ${m.status || ''}">${m.value}</span>
            </div>
          `).join('')}
          ${section.details ? `<p style="margin-top: 16px; font-size: 13px; color: #666;">${section.details}</p>` : ''}
          ${section.recommendations && section.recommendations.length > 0 ? `
            <div class="recommendations">
              <h4>Recommendations</h4>
              <ul>
                ${section.recommendations.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    ${report.bugs.length > 0 ? `
      <div class="bugs-section">
        <h2 style="margin-bottom: 24px; font-size: 24px;">🐛 Bugs Found (${report.bugs.length})</h2>
        ${report.bugs.map(bug => `
          <div class="bug-item">
            <div class="bug-title">${bug.title}</div>
            <div style="margin: 8px 0;">
              <span class="bug-severity severity-${bug.severity}">${bug.severity}</span>
              <span style="font-size: 12px; color: #666;">Found by: ${bug.foundBy}</span>
              ${bug.githubUrl ? `<a href="${bug.githubUrl}" target="_blank" style="margin-left: 12px; font-size: 12px;">View on GitHub →</a>` : ''}
            </div>
            <p style="font-size: 13px; color: #666; margin-top: 8px;">${bug.description.substring(0, 200)}${bug.description.length > 200 ? '...' : ''}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="footer">
      <p>Generated by OpenQA - Autonomous QA Testing Platform</p>
      <p style="margin-top: 8px;">Report generated on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`;
  }
}
