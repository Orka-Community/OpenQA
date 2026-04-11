import { OpenQADatabase, TestSession, Action, Bug } from '../../database/index.js';

export type ExportFormat = 'json' | 'csv' | 'html';

interface SessionExport {
  session: TestSession;
  actions: Action[];
  bugs: Bug[];
}

export class ExportService {
  constructor(private db: OpenQADatabase) {}

  async exportSession(sessionId: string, format: ExportFormat): Promise<{ content: string; contentType: string; filename: string }> {
    const session = await this.db.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const actions = await this.db.getSessionActions(sessionId);
    const allBugs = await this.db.getAllBugs();
    const bugs = allBugs.filter(b => b.session_id === sessionId);

    const data: SessionExport = { session, actions, bugs };

    switch (format) {
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          contentType: 'application/json',
          filename: `openqa-session-${sessionId}.json`,
        };
      case 'csv':
        return {
          content: this.toCSV(data),
          contentType: 'text/csv',
          filename: `openqa-session-${sessionId}.csv`,
        };
      case 'html':
        return {
          content: this.toHTML(data),
          contentType: 'text/html',
          filename: `openqa-session-${sessionId}.html`,
        };
    }
  }

  private toCSV(data: SessionExport): string {
    const lines: string[] = [];

    // Session summary
    lines.push('# Session Summary');
    lines.push('id,started_at,ended_at,status,total_actions,bugs_found');
    lines.push([
      data.session.id,
      data.session.started_at,
      data.session.ended_at || '',
      data.session.status,
      data.session.total_actions,
      data.session.bugs_found,
    ].join(','));

    // Actions
    lines.push('');
    lines.push('# Actions');
    lines.push('id,timestamp,type,description');
    for (const a of data.actions) {
      lines.push([
        a.id,
        a.timestamp,
        this.csvEscape(a.type),
        this.csvEscape(a.description),
      ].join(','));
    }

    // Bugs
    lines.push('');
    lines.push('# Bugs');
    lines.push('id,title,severity,status,created_at');
    for (const b of data.bugs) {
      lines.push([
        b.id,
        this.csvEscape(b.title),
        b.severity,
        b.status,
        b.created_at,
      ].join(','));
    }

    return lines.join('\n');
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private toHTML(data: SessionExport): string {
    const severityColor: Record<string, string> = {
      critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a',
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OpenQA Report — Session ${data.session.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #1a1a2e; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; margin: 2rem 0 0.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.25rem; }
    .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .stats { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; }
    .stat { background: #f8fafc; border-radius: 8px; padding: 1rem; flex: 1; text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .stat-label { color: #64748b; font-size: 0.8rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
    th { background: #f8fafc; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; color: white; }
    .footer { margin-top: 3rem; color: #94a3b8; font-size: 0.8rem; text-align: center; }
  </style>
</head>
<body>
  <h1>OpenQA Session Report</h1>
  <p class="meta">${data.session.id} &mdash; ${data.session.started_at}${data.session.ended_at ? ` to ${data.session.ended_at}` : ' (in progress)'}</p>

  <div class="stats">
    <div class="stat"><div class="stat-value">${data.session.total_actions}</div><div class="stat-label">Actions</div></div>
    <div class="stat"><div class="stat-value">${data.bugs.length}</div><div class="stat-label">Bugs Found</div></div>
    <div class="stat"><div class="stat-value">${data.session.status}</div><div class="stat-label">Status</div></div>
    <div class="stat"><div class="stat-value">${data.session.total_actions > 0 ? Math.round(((data.session.total_actions - data.session.bugs_found) / data.session.total_actions) * 100) : 0}%</div><div class="stat-label">Success Rate</div></div>
  </div>

  ${data.bugs.length > 0 ? `
  <h2>Bugs (${data.bugs.length})</h2>
  <table>
    <thead><tr><th>Title</th><th>Severity</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>
      ${data.bugs.map(b => `<tr>
        <td>${this.htmlEscape(b.title)}</td>
        <td><span class="badge" style="background:${severityColor[b.severity] || '#64748b'}">${b.severity}</span></td>
        <td>${b.status}</td>
        <td>${b.created_at}</td>
      </tr>`).join('\n      ')}
    </tbody>
  </table>` : ''}

  ${data.actions.length > 0 ? `
  <h2>Actions (${data.actions.length})</h2>
  <table>
    <thead><tr><th>Type</th><th>Description</th><th>Timestamp</th></tr></thead>
    <tbody>
      ${data.actions.slice(0, 100).map(a => `<tr>
        <td>${this.htmlEscape(a.type)}</td>
        <td>${this.htmlEscape(a.description)}</td>
        <td>${a.timestamp}</td>
      </tr>`).join('\n      ')}
    </tbody>
  </table>
  ${data.actions.length > 100 ? `<p class="meta">&hellip; and ${data.actions.length - 100} more actions</p>` : ''}` : ''}

  <p class="footer">Generated by OpenQA on ${new Date().toISOString()}</p>
</body>
</html>`;
  }

  private htmlEscape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
