import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getCoverageHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'coverage' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Coverage</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}

    .coverage-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .coverage-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .coverage-ring {
      width: 120px;
      height: 120px;
      margin: 0 auto 16px;
      position: relative;
    }
    .coverage-ring svg {
      transform: rotate(-90deg);
    }
    .coverage-ring circle {
      fill: none;
      stroke-width: 10;
    }
    .coverage-ring .bg { stroke: var(--panel); }
    .coverage-ring .fill { stroke-linecap: round; transition: stroke-dashoffset 0.5s; }
    .coverage-ring .fill.green { stroke: var(--green); }
    .coverage-ring .fill.yellow { stroke: var(--yellow); }
    .coverage-ring .fill.red { stroke: var(--red); }
    .coverage-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 22px;
      font-weight: 600;
      white-space: nowrap;
    }
    .coverage-label { font-size: 14px; font-weight: 600; color: var(--text-2); }
    .coverage-sublabel { font-size: 11px; color: var(--text-3); margin-top: 4px; font-family: var(--mono); }

    .coverage-details {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .details-header {
      padding: 16px 20px;
      background: var(--panel);
      font-size: 14px;
      font-weight: 700;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .details-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 140px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      align-items: center;
    }
    .details-row:last-child { border-bottom: none; }
    .details-row:hover { background: var(--panel); }
    .details-row.header {
      background: var(--panel);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .file-path {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text-2);
    }
    .coverage-bar {
      height: 6px;
      background: var(--panel);
      border-radius: 3px;
      overflow: hidden;
    }
    .coverage-bar-fill {
      height: 100%;
      transition: width 0.3s;
    }
    .coverage-bar-fill.green { background: var(--green); }
    .coverage-bar-fill.yellow { background: var(--yellow); }
    .coverage-bar-fill.red { background: var(--red); }

    .badge-count {
      font-size: 11px;
      font-family: var(--mono);
      background: var(--panel);
      border: 1px solid var(--border-hi);
      border-radius: 20px;
      padding: 2px 8px;
      color: var(--text-2);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }
    .empty-state p { font-size: 13px; }

    .summary-bar {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      gap: 32px;
      align-items: center;
    }
    .summary-stat { display: flex; flex-direction: column; gap: 2px; }
    .summary-stat-value { font-size: 20px; font-weight: 700; }
    .summary-stat-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Coverage</div>
          <div class="page-breadcrumb">openqa / testing / coverage</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadCoverage()">↻ Refresh</button>
          <button class="btn btn-ghost" onclick="exportCoverage()">⬇ Export CSV</button>
        </div>
      </div>

      <div class="content">

      <!-- Summary bar -->
      <div class="summary-bar" id="summary-bar" style="display:none">
        <div class="summary-stat">
          <div class="summary-stat-value" id="sum-pages">0</div>
          <div class="summary-stat-label">Pages visited</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" id="sum-actions">0</div>
          <div class="summary-stat-label">Total actions</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" id="sum-forms">0</div>
          <div class="summary-stat-label">Forms tested</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" id="sum-api">0</div>
          <div class="summary-stat-label">API calls</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--red)" id="sum-issues">0</div>
          <div class="summary-stat-label">Issues found</div>
        </div>
      </div>

      <div class="coverage-grid" id="coverage-summary">
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="pages-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="pages-value">—</div>
          </div>
          <div class="coverage-label">Pages Visited</div>
          <div class="coverage-sublabel" id="pages-sub">No data</div>
        </div>
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="actions-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="actions-value">—</div>
          </div>
          <div class="coverage-label">Actions Tested</div>
          <div class="coverage-sublabel" id="actions-sub">No data</div>
        </div>
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="forms-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="forms-value">—</div>
          </div>
          <div class="coverage-label">Forms Validated</div>
          <div class="coverage-sublabel" id="forms-sub">No data</div>
        </div>
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="api-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="api-value">—</div>
          </div>
          <div class="coverage-label">API Endpoints</div>
          <div class="coverage-sublabel" id="api-sub">No data</div>
        </div>
      </div>

      <div class="coverage-details">
        <div class="details-header">
          <span>Coverage by Page / Route</span>
          <span class="badge-count" id="page-count">0 routes</span>
        </div>
        <div class="details-row header">
          <div>Page / Route</div>
          <div>Visits</div>
          <div>Actions</div>
          <div>Issues</div>
          <div>Coverage</div>
        </div>
        <div id="coverage-list">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <h3>No coverage data yet</h3>
            <p>Run a test session to start tracking coverage</p>
          </div>
        </div>
      </div>

    </div>
    </main>
  </div>

  <script>
    // Raw data kept in memory for CSV export
    let _coverageData = [];
    let _statsData = {};

    async function loadCoverage() {
      try {
        const [coverageRes, statsRes] = await Promise.all([
          fetch('/api/coverage', { credentials: 'include' }),
          fetch('/api/coverage/stats', { credentials: 'include' })
        ]);

        const coverage = Array.isArray(await coverageRes.clone().json()) ? await coverageRes.json() : [];
        const stats = await statsRes.json();

        _coverageData = coverage;
        _statsData = stats;

        const pages      = stats.totalPages      || 0;
        const actions    = stats.totalActions    || 0;
        const forms      = stats.totalForms      || 0;
        const apiCalls   = stats.totalApiCalls   || 0;
        const issues     = coverage.reduce((sum, e) => sum + (e.issues_found || 0), 0);

        // ── Summary bar ─────────────────────────────────────────────────────
        if (pages > 0 || actions > 0) {
          document.getElementById('summary-bar').style.display = 'flex';
          document.getElementById('sum-pages').textContent   = pages;
          document.getElementById('sum-actions').textContent = actions;
          document.getElementById('sum-forms').textContent   = forms;
          document.getElementById('sum-api').textContent     = apiCalls;
          document.getElementById('sum-issues').textContent  = issues;
        }

        // ── Rings — show raw counts, % derived from local max ────────────────
        // We use the max across all rings as 100% so numbers scale together.
        const maxCount = Math.max(pages, actions, forms, apiCalls, 1);

        updateRing('pages',   pages,   pages   + ' pages',   maxCount);
        updateRing('actions', actions, actions + ' actions', maxCount);
        updateRing('forms',   forms,   forms   + ' forms',   maxCount);
        updateRing('api',     apiCalls,apiCalls+ ' calls',   maxCount);

        // ── Page list ────────────────────────────────────────────────────────
        const pageData = {};
        coverage.forEach(entry => {
          pageData[entry.path] = {
            visits:   entry.visits        || 0,
            actions:  entry.actions       || 0,
            issues:   entry.issues_found  || 0,
            forms:    entry.forms_tested  || 0,
            api:      entry.api_calls     || 0,
            coverage: entry.coverage_percent || null,
          };
        });

        document.getElementById('page-count').textContent = coverage.length + ' route' + (coverage.length !== 1 ? 's' : '');
        renderCoverageList(pageData);

      } catch (error) {
        console.error('Failed to load coverage:', error);
      }
    }

    function updateRing(id, count, label, maxCount) {
      const ring  = document.getElementById(id + '-ring');
      const value = document.getElementById(id + '-value');
      const sub   = document.getElementById(id + '-sub');

      // Percent relative to local max — so at least one ring always hits 100%
      const percent = maxCount > 0 ? Math.min(100, Math.round((count / maxCount) * 100)) : 0;
      const circumference = 314;
      ring.style.strokeDashoffset = circumference - (percent / 100) * circumference;

      // Display: raw count when available, em dash when nothing yet
      value.textContent = count > 0 ? count : '—';
      if (sub) sub.textContent = count > 0 ? label : 'No data';

      ring.classList.remove('green', 'yellow', 'red');
      if (count === 0)      ring.classList.add('red');
      else if (percent < 40) ring.classList.add('yellow');
      else                   ring.classList.add('green');
    }

    function renderCoverageList(pageData) {
      const container = document.getElementById('coverage-list');
      const pages = Object.entries(pageData).sort((a, b) => (b[1] as any).actions - (a[1] as any).actions);

      if (pages.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <h3>No coverage data yet</h3>
            <p>Run a test session to start tracking coverage</p>
          </div>
        \`;
        return;
      }

      const maxActions = Math.max(...pages.map(([, d]: any) => d.actions), 1);

      container.innerHTML = pages.map(([path, data]: any) => {
        // coverage_percent from DB if available; otherwise % of max actions
        const coverage   = data.coverage !== null ? data.coverage : Math.min(100, Math.round((data.actions / maxActions) * 100));
        const colorClass = coverage >= 70 ? 'green' : coverage >= 40 ? 'yellow' : 'red';

        return \`
          <div class="details-row">
            <div class="file-path">\${escHtml(path)}</div>
            <div style="color:var(--text-2)">\${data.visits}</div>
            <div style="color:var(--text-2)">\${data.actions}</div>
            <div style="color:\${data.issues > 0 ? 'var(--red)' : 'var(--text-3)'}">\${data.issues || '—'}</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="coverage-bar" style="flex:1">
                  <div class="coverage-bar-fill \${colorClass}" style="width:\${coverage}%"></div>
                </div>
                <span style="font-family:var(--mono);font-size:11px;color:var(--text-2);min-width:35px">\${coverage}%</span>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function exportCoverage() {
      if (_coverageData.length === 0) {
        alert('No coverage data to export. Run a session first.');
        return;
      }
      const headers = ['Path','Visits','Actions','Forms Tested','API Calls','Issues Found','Coverage %'];
      const rows = _coverageData.map(e => [
        e.path,
        e.visits        || 0,
        e.actions       || 0,
        e.forms_tested  || 0,
        e.api_calls     || 0,
        e.issues_found  || 0,
        e.coverage_percent || 0,
      ]);

      const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(',')).join('\\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'openqa-coverage-' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }

    // ── WebSocket for realtime coverage updates ───────────────────────────────
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + window.location.host);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sessions' || msg.type === 'session' || msg.type === 'status') {
            loadCoverage();
          }
        } catch {}
      };

      ws.onclose = () => setTimeout(initWebSocket, 3000);
    }

    loadCoverage();
    initWebSocket();
  </script>
</body>
</html>`;
}
