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
      font-size: 24px;
      font-weight: 600;
    }
    .coverage-label { font-size: 14px; font-weight: 600; color: var(--text-2); }

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
    }
    .details-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 120px;
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

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }

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
          <button class="btn btn-ghost" onclick="exportCoverage()">Export</button>
        </div>
      </div>

      <div class="content">
      <div class="coverage-grid" id="coverage-summary">
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="pages-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="pages-value">0%</div>
          </div>
          <div class="coverage-label">Pages Covered</div>
        </div>
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="actions-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="actions-value">0%</div>
          </div>
          <div class="coverage-label">Actions Tested</div>
        </div>
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="forms-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="forms-value">0%</div>
          </div>
          <div class="coverage-label">Forms Validated</div>
        </div>
        <div class="coverage-card">
          <div class="coverage-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="bg" cx="60" cy="60" r="50"/>
              <circle class="fill green" cx="60" cy="60" r="50" id="api-ring" stroke-dasharray="314" stroke-dashoffset="314"/>
            </svg>
            <div class="coverage-value" id="api-value">0%</div>
          </div>
          <div class="coverage-label">API Endpoints</div>
        </div>
      </div>

      <div class="coverage-details">
        <div class="details-header">Coverage by Page</div>
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
            <p>Run test sessions to generate coverage reports</p>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    async function loadCoverage() {
      try {
        const [coverageRes, statsRes] = await Promise.all([
          fetch('/api/coverage', { credentials: 'include' }),
          fetch('/api/coverage/stats', { credentials: 'include' })
        ]);
        
        const coverage = await coverageRes.json();
        const stats = await statsRes.json();
        
        // Calculate percentages based on real data
        // Pages: percentage of discovered pages (assume target has ~10 main pages)
        const estimatedTotalPages = 10;
        const pagesPercent = stats.totalPages > 0 
          ? Math.min(100, Math.round((stats.totalPages / estimatedTotalPages) * 100))
          : 0;
        
        // Actions: percentage based on total actions (100 actions = 100%)
        const actionsPercent = stats.totalActions > 0 
          ? Math.min(100, Math.round((stats.totalActions / 100) * 100))
          : 0;
        
        // Forms: percentage based on forms tested
        const formsPercent = stats.totalForms > 0 
          ? Math.min(100, Math.round((stats.totalForms / 20) * 100))
          : 0;
        
        // API: percentage based on API calls
        const apiPercent = stats.totalApiCalls > 0 
          ? Math.min(100, Math.round((stats.totalApiCalls / 30) * 100))
          : 0;
        
        updateRing('pages', pagesPercent);
        updateRing('actions', actionsPercent);
        updateRing('forms', formsPercent);
        updateRing('api', apiPercent);
        
        // Convert coverage array to pageData format
        const pageData = {};
        coverage.forEach(entry => {
          pageData[entry.path] = {
            visits: entry.visits,
            actions: entry.actions,
            issues: entry.issues_found,
            forms_tested: entry.forms_tested,
            api_calls: entry.api_calls,
            coverage_percent: entry.coverage_percent
          };
        });
        
        // Render page list
        renderCoverageList(pageData);
        
      } catch (error) {
        console.error('Failed to load coverage:', error);
      }
    }

    function updateRing(id, percent) {
      const ring = document.getElementById(id + '-ring');
      const value = document.getElementById(id + '-value');
      const circumference = 314; // 2 * PI * 50
      const offset = circumference - (percent / 100) * circumference;
      
      ring.style.strokeDashoffset = offset;
      value.textContent = percent + '%';
      
      // Update color based on percentage
      ring.classList.remove('green', 'yellow', 'red');
      if (percent >= 80) ring.classList.add('green');
      else if (percent >= 50) ring.classList.add('yellow');
      else ring.classList.add('red');
    }

    function renderCoverageList(pageData) {
      const container = document.getElementById('coverage-list');
      const pages = Object.entries(pageData).sort((a, b) => b[1].actions - a[1].actions);
      
      if (pages.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <h3>No coverage data yet</h3>
            <p>Run test sessions to generate coverage reports</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = pages.map(([path, data]) => {
        const coverage = data.coverage_percent || Math.min(100, Math.round((data.actions / 50) * 100));
        const colorClass = coverage >= 80 ? 'green' : coverage >= 50 ? 'yellow' : 'red';
        
        return \`
          <div class="details-row">
            <div class="file-path">\${path}</div>
            <div style="color:var(--text-2)">\${data.visits}</div>
            <div style="color:var(--text-2)">\${data.actions}</div>
            <div style="color:\${data.issues > 0 ? 'var(--red)' : 'var(--text-3)'}">\${data.issues}</div>
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

    function exportCoverage() {
      alert('Coverage report export coming soon!');
    }

    // ── WebSocket for realtime coverage updates ────────────────────────────────
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + window.location.host);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Refresh coverage whenever sessions or status change
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
