import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getApprovalsHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'approvals' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Approvals</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}

    .filter-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    .filter-btn {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid var(--border-hi);
      background: var(--panel);
      color: var(--text-2);
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-btn:hover { color: var(--text-1); background: var(--surface); }
    .filter-btn.active { background: var(--accent-lo); border-color: var(--accent); color: var(--accent); }

    .finding-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 12px;
      transition: border-color 0.15s;
    }
    .finding-card:hover { border-color: var(--border-hi); }
    .finding-card.approved { border-left: 3px solid var(--green); }
    .finding-card.rejected { border-left: 3px solid var(--red); opacity: 0.6; }
    .finding-card.pending  { border-left: 3px solid var(--yellow); }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      gap: 12px;
    }
    .finding-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-1);
      flex: 1;
    }
    .finding-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }
    .finding-description {
      font-size: 13px;
      color: var(--text-2);
      line-height: 1.6;
      margin-bottom: 14px;
      white-space: pre-wrap;
    }
    .finding-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .finding-info {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-3);
    }
    .finding-actions {
      display: flex;
      gap: 8px;
    }

    .badge-sev {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .badge-sev.critical { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-sev.high     { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-sev.medium   { background: rgba(56,189,248,0.15); color: #38bdf8; }
    .badge-sev.low      { background: rgba(100,116,139,0.15); color: #64748b; }

    .badge-status {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .badge-status.pending  { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-status.approved { background: rgba(34,197,94,0.15);  color: #22c55e; }
    .badge-status.rejected { background: rgba(100,116,139,0.15); color: #64748b; }

    .confidence-pill {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }
    .empty-state p  { font-size: 13px; max-width: 400px; margin: 0 auto; line-height: 1.6; }

    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-chip {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    }
    .stat-chip-value { font-size: 22px; font-weight: 800; }
    .stat-chip-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Approvals</div>
          <div class="page-breadcrumb">openqa / testing / approvals</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadFindings()">↻ Refresh</button>
        </div>
      </div>

      <div class="content">

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-chip">
            <div class="stat-chip-value" style="color:var(--yellow)" id="count-pending">0</div>
            <div class="stat-chip-label">Pending</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip-value" style="color:var(--green)" id="count-approved">0</div>
            <div class="stat-chip-label">Approved</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip-value" style="color:var(--text-3)" id="count-rejected">0</div>
            <div class="stat-chip-label">Rejected</div>
          </div>
        </div>

        <!-- Filter tabs -->
        <div class="filter-bar">
          <button class="filter-btn active" onclick="switchFilter('pending')"  id="btn-pending">Pending</button>
          <button class="filter-btn"        onclick="switchFilter('approved')" id="btn-approved">Approved</button>
          <button class="filter-btn"        onclick="switchFilter('rejected')" id="btn-rejected">Rejected</button>
        </div>

        <div id="findings-list">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3>No pending findings</h3>
            <p>Findings with a confidence score between 50 and 74 are sent here for human review before appearing on the Issues board.</p>
          </div>
        </div>

      </div>
    </main>
  </div>

  <script>
    let currentFilter = 'pending';
    let allFindings   = { pending: [], approved: [], rejected: [] };

    async function loadFindings() {
      try {
        const [pendRes, appRes, rejRes] = await Promise.all([
          fetch('/api/approvals?status=pending',  { credentials: 'include' }),
          fetch('/api/approvals?status=approved', { credentials: 'include' }),
          fetch('/api/approvals?status=rejected', { credentials: 'include' }),
        ]);

        allFindings.pending  = Array.isArray(await pendRes.clone().json()) ? await pendRes.json()  : [];
        allFindings.approved = Array.isArray(await appRes.clone().json())  ? await appRes.json()   : [];
        allFindings.rejected = Array.isArray(await rejRes.clone().json())  ? await rejRes.json()   : [];

        document.getElementById('count-pending').textContent  = allFindings.pending.length;
        document.getElementById('count-approved').textContent = allFindings.approved.length;
        document.getElementById('count-rejected').textContent = allFindings.rejected.length;

        render();
      } catch (e) {
        console.error('Failed to load findings', e);
      }
    }

    function switchFilter(status) {
      currentFilter = status;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-' + status).classList.add('active');
      render();
    }

    function render() {
      const container = document.getElementById('findings-list');
      const findings  = allFindings[currentFilter] || [];

      if (findings.length === 0) {
        const msgs = {
          pending:  { title: 'No pending findings', body: 'Findings with a confidence score between 50–74 are queued here for human review before appearing on the Issues board.' },
          approved: { title: 'No approved findings', body: 'Approve a pending finding to promote it to the Issues and Kanban boards.' },
          rejected: { title: 'No rejected findings', body: 'Rejected findings are stored here for audit purposes.' },
        };
        const m = msgs[currentFilter];
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3>\${m.title}</h3>
            <p>\${m.body}</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = findings.map(f => \`
        <div class="finding-card \${f.status}" id="card-\${f.id}">
          <div class="finding-header">
            <div class="finding-title">\${escHtml(f.title)}</div>
            <div class="finding-meta">
              <span class="badge-sev \${f.severity}">\${f.severity}</span>
              <span class="badge-status \${f.status}">\${f.status}</span>
            </div>
          </div>
          <div class="finding-description">\${escHtml(f.description)}</div>
          <div class="finding-footer">
            <div class="finding-info">
              <span>Confidence: <span class="confidence-pill">\${f.confidence}/100</span></span>
              \${f.category ? '<span>Category: <strong>' + escHtml(f.category) + '</strong></span>' : ''}
              \${f.specialist_type ? '<span>By: <strong>' + escHtml(f.specialist_type) + '</strong></span>' : ''}
              \${f.url ? '<span><a href="' + escHtml(f.url) + '" target="_blank" style="color:var(--accent);text-decoration:none;">View URL ↗</a></span>' : ''}
            </div>
            \${f.status === 'pending' ? \`
              <div class="finding-actions">
                <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px;color:var(--red)" onclick="reject('\${f.id}')">✕ Reject</button>
                <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px;color:var(--green)" onclick="approve('\${f.id}')">✓ Approve</button>
              </div>
            \` : ''}
          </div>
        </div>
      \`).join('');
    }

    async function approve(id) {
      try {
        const r = await fetch('/api/approvals/' + id + '/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (r.ok) { await loadFindings(); }
        else       { alert('Failed to approve finding.'); }
      } catch (e) { alert('Network error: ' + e.message); }
    }

    async function reject(id) {
      if (!confirm('Reject this finding? It will be archived.')) return;
      try {
        const r = await fetch('/api/approvals/' + id + '/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (r.ok) { await loadFindings(); }
        else       { alert('Failed to reject finding.'); }
      } catch (e) { alert('Network error: ' + e.message); }
    }

    function escHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // WebSocket — refresh when findings change
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + window.location.host);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sessions' || msg.type === 'session' || msg.type === 'status') loadFindings();
        } catch {}
      };
      ws.onclose = () => setTimeout(initWebSocket, 3000);
    }

    loadFindings();
    initWebSocket();
  </script>
</body>
</html>`;
}
