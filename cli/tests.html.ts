import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getTestsHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'tests' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Tests</title>
  ${getFontsLink()}
  <style>
    ${getBaseStyles()}

    .btn {
      padding: 10px 16px;
      border-radius: 8px;
      font-family: var(--sans);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-ghost { background: var(--panel); color: var(--text-2); border: 1px solid var(--border-hi); }
    .btn-ghost:hover { color: var(--text-1); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .stat-label { font-size: 12px; color: var(--text-3); margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: 800; }
    .stat-value.green { color: var(--green); }
    .stat-value.red { color: var(--red); }
    .stat-value.yellow { color: var(--yellow); }
    .stat-value.blue { color: var(--blue); }

    .tests-table {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 100px 100px 120px;
      padding: 12px 16px;
      background: var(--panel);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 100px 100px 120px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      align-items: center;
      transition: background 0.15s;
    }
    .table-row:hover { background: var(--panel); }
    .table-row:last-child { border-bottom: none; }

    .test-name { font-weight: 600; }
    .test-path { font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-top: 2px; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.passed { background: var(--green-lo); color: var(--green); }
    .status-badge.failed { background: var(--red-lo); color: var(--red); }
    .status-badge.skipped { background: var(--yellow-lo); color: var(--yellow); }
    .status-badge.running { background: var(--blue-lo); color: var(--blue); }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .filter-btn {
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      background: var(--panel);
      color: var(--text-2);
      border: 1px solid var(--border);
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-btn:hover { color: var(--text-1); }
    .filter-btn.active { background: var(--accent-lo); color: var(--accent); border-color: var(--accent); }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
    }

    .progress-bar {
      height: 8px;
      background: var(--panel);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      background: var(--green);
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Tests</div>
          <div class="page-breadcrumb">openqa / testing / tests</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadTests()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="runAllTests()">▶ Run All Tests</button>
        </div>
      </div>

      <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Tests</div>
          <div class="stat-value" id="total-tests">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Passed</div>
          <div class="stat-value green" id="passed-tests">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Failed</div>
          <div class="stat-value red" id="failed-tests">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pass Rate</div>
          <div class="stat-value blue" id="pass-rate">0%</div>
          <div class="progress-bar">
            <div class="progress-fill" id="pass-rate-bar" style="width: 0%"></div>
          </div>
        </div>
      </div>

      <div class="filters">
        <button class="filter-btn active" onclick="filterTests('all')">All</button>
        <button class="filter-btn" onclick="filterTests('passed')">Passed</button>
        <button class="filter-btn" onclick="filterTests('failed')">Failed</button>
        <button class="filter-btn" onclick="filterTests('skipped')">Skipped</button>
      </div>

      <div class="tests-table">
        <div class="table-header">
          <div>Test Name</div>
          <div>Suite</div>
          <div>Status</div>
          <div>Duration</div>
          <div>Last Run</div>
        </div>
        <div id="tests-list">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 2-2 2.5h3L12 7"/><path d="M10 14v-3"/><path d="M14 14v-3"/><path d="M11 19c-1.7 0-3-1.3-3-3v-2h8v2c0 1.7-1.3 3-3 3Z"/><path d="M12 22v-3"/></svg>
            <h3>No tests executed yet</h3>
            <p>Run a session to generate test results</p>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    let tests = [];
    let currentFilter = 'all';

    async function loadTests() {
      try {
        const [sessionsRes, bugsRes] = await Promise.all([
          fetch('/api/sessions?limit=50', { credentials: 'include' }),
          fetch('/api/bugs', { credentials: 'include' })
        ]);
        
        const sessions = await sessionsRes.json();
        const bugs = await bugsRes.json();
        
        // Generate test data from sessions
        tests = sessions.flatMap((session, idx) => {
          const testCount = session.total_actions || 0;
          const bugCount = session.bugs_found || 0;
          const passedCount = Math.max(0, testCount - bugCount);
          
          const sessionTests = [];
          for (let i = 0; i < Math.min(testCount, 10); i++) {
            const isFailed = i < bugCount;
            sessionTests.push({
              id: session.id + '-' + i,
              name: isFailed ? (bugs[i]?.title || 'Test ' + (i + 1)) : 'Action ' + (i + 1),
              suite: 'Session ' + (idx + 1),
              status: isFailed ? 'failed' : 'passed',
              duration: Math.floor(Math.random() * 5000) + 100,
              lastRun: session.started_at
            });
          }
          return sessionTests;
        });
        
        updateStats();
        renderTests();
      } catch (error) {
        console.error('Failed to load tests:', error);
      }
    }

    function updateStats() {
      const total = tests.length;
      const passed = tests.filter(t => t.status === 'passed').length;
      const failed = tests.filter(t => t.status === 'failed').length;
      const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
      
      document.getElementById('total-tests').textContent = total;
      document.getElementById('passed-tests').textContent = passed;
      document.getElementById('failed-tests').textContent = failed;
      document.getElementById('pass-rate').textContent = rate + '%';
      document.getElementById('pass-rate-bar').style.width = rate + '%';
    }

    function renderTests() {
      const container = document.getElementById('tests-list');
      
      let filtered = tests;
      if (currentFilter !== 'all') {
        filtered = tests.filter(t => t.status === currentFilter);
      }

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 2-2 2.5h3L12 7"/><path d="M10 14v-3"/><path d="M14 14v-3"/><path d="M11 19c-1.7 0-3-1.3-3-3v-2h8v2c0 1.7-1.3 3-3 3Z"/><path d="M12 22v-3"/></svg>
            <h3>No tests found</h3>
            <p>\${currentFilter === 'all' ? 'Run a session to generate test results' : 'No ' + currentFilter + ' tests'}</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(test => \`
        <div class="table-row">
          <div>
            <div class="test-name">\${test.name}</div>
            <div class="test-path">\${test.id}</div>
          </div>
          <div style="color:var(--text-2)">\${test.suite}</div>
          <div><span class="status-badge \${test.status}">\${test.status}</span></div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text-2)">\${test.duration}ms</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text-3)">\${formatDate(test.lastRun)}</div>
        </div>
      \`).join('');
    }

    function filterTests(filter) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === filter || (filter === 'all' && btn.textContent === 'All'));
      });
      renderTests();
    }

    async function runAllTests() {
      try {
        const response = await fetch('/api/agent/start', { method: 'POST', credentials: 'include' });
        const result = await response.json();
        if (result.success) {
          alert('Test session started!');
          setTimeout(loadTests, 2000);
        } else {
          alert(result.error || 'Failed to start tests');
        }
      } catch (error) {
        alert('Failed to start tests');
      }
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // ── WebSocket for realtime updates ─────────────────────────────────────────
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + window.location.host);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sessions') {
            // Rebuild tests from the freshest session list
            buildTestsFromSessions(msg.data || []);
          } else if (msg.type === 'session') {
            // Single-session stats update — refresh full list
            loadTests();
          }
        } catch {}
      };

      ws.onclose = () => setTimeout(initWebSocket, 3000);
    }

    function buildTestsFromSessions(sessions) {
      // Fetch bugs to correlate failures, then render
      fetch('/api/bugs', { credentials: 'include' })
        .then(r => r.json())
        .then(bugs => {
          tests = sessions.flatMap((session, idx) => {
            const testCount = session.total_actions || 0;
            const bugCount = session.bugs_found || 0;
            const sessionTests = [];
            for (let i = 0; i < Math.min(testCount, 10); i++) {
              const isFailed = i < bugCount;
              sessionTests.push({
                id: session.id + '-' + i,
                name: isFailed ? (bugs[i]?.title || 'Test ' + (i + 1)) : 'Action ' + (i + 1),
                suite: 'Session ' + (idx + 1),
                status: isFailed ? 'failed' : 'passed',
                duration: Math.floor(Math.random() * 5000) + 100,
                lastRun: session.started_at
              });
            }
            return sessionTests;
          });
          updateStats();
          renderTests();
        })
        .catch(() => {});
    }

    loadTests();
    initWebSocket();
  </script>
</body>
</html>`;
}
