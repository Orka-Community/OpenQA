import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getLogsHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'logs' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Logs</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}
    --purple: #a855f7;
    --purple-lo: rgba(168,85,247,0.12);

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
    .btn-ghost { background: var(--panel); color: var(--text-2); border: 1px solid var(--border-hi); }
    .btn-ghost:hover { color: var(--text-1); }
    .btn-danger { background: var(--red); color: #fff; }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-shrink: 0;
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

    .logs-container {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .logs-header {
      padding: 12px 16px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .logs-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-2);
    }
    .logs-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-3);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .logs-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.6;
    }

    .log-entry {
      padding: 8px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 12px;
      transition: background 0.15s;
    }
    .log-entry:hover { background: var(--panel); }
    .log-entry:last-child { border-bottom: none; }

    .log-time {
      color: var(--text-3);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .log-level {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .log-level.info { background: var(--blue-lo); color: var(--blue); }
    .log-level.warn { background: var(--yellow-lo); color: var(--yellow); }
    .log-level.error { background: var(--red-lo); color: var(--red); }
    .log-level.debug { background: var(--purple-lo); color: var(--purple); }
    .log-level.success { background: var(--green-lo); color: var(--green); }

    .log-message {
      color: var(--text-2);
      word-break: break-word;
      flex: 1;
    }
    .log-message .highlight { color: var(--accent); }

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

    .search-box {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      padding: 10px 14px;
      background: var(--panel);
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      font-family: var(--mono);
      font-size: 13px;
      color: var(--text-1);
      outline: none;
    }
    .search-input:focus { border-color: var(--accent); }
    .search-input::placeholder { color: var(--text-3); }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Logs</div>
          <div class="page-breadcrumb">openqa / testing / logs</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="toggleAutoScroll()">Auto-scroll</button>
          <button class="btn btn-ghost" onclick="clearLogs()">Clear</button>
          <button class="btn btn-ghost" onclick="downloadLogs()">Download</button>
        </div>
      </div>

      <div class="content">
      <div class="search-box">
        <input type="text" class="search-input" id="search-input" placeholder="Search logs..." oninput="filterLogs()">
      </div>

      <div class="filters">
        <button class="filter-btn active" onclick="setFilter('all')">All</button>
        <button class="filter-btn" onclick="setFilter('info')">Info</button>
        <button class="filter-btn" onclick="setFilter('warn')">Warnings</button>
        <button class="filter-btn" onclick="setFilter('error')">Errors</button>
        <button class="filter-btn" onclick="setFilter('debug')">Debug</button>
      </div>

      <div class="logs-container">
        <div class="logs-header">
          <div class="logs-title">Live Log Stream</div>
          <div class="logs-status">
            <div class="status-dot" id="status-dot"></div>
            <span id="status-text">Connected</span>
          </div>
        </div>
        <div class="logs-content" id="logs-content">
          <!-- Logs will be inserted here -->
        </div>
      </div>
    </main>
  </div>

  <script>
    let logs = [];
    let currentFilter = 'all';
    let autoScroll = true;
    let ws = null;

    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + window.location.host);
      
      ws.onopen = () => {
        updateStatus(true);
        addLog('info', 'Connected to OpenQA server');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'activity') {
            addLog(data.data.type || 'info', data.data.message);
          } else if (data.type === 'log') {
            addLog(data.level || 'info', data.msg || data.message);
          } else if (data.type === 'sessions' && Array.isArray(data.data)) {
            // Update session summary log entries
            data.data.slice(0, 3).forEach((s) => {
              const shortId = s.id.startsWith('session_') ? s.id.substring(8, 20) : s.id.substring(0, 12);
              if (s.status === 'running') {
                addLog('info', \`Session \${shortId} [running] — \${s.total_actions || 0} actions, \${s.bugs_found || 0} bugs (live)\`);
              }
            });
          } else if (data.type === 'status') {
            if (data.data?.isRunning) {
              addLog('info', 'Agent is running — session active');
            }
          }
        } catch {}
      };
      
      ws.onclose = () => {
        updateStatus(false);
        addLog('warn', 'Disconnected from server. Reconnecting...');
        setTimeout(initWebSocket, 3000);
      };
      
      ws.onerror = () => {
        updateStatus(false);
      };
    }

    function updateStatus(connected) {
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');
      dot.style.background = connected ? 'var(--green)' : 'var(--red)';
      text.textContent = connected ? 'Connected' : 'Disconnected';
    }

    function addLog(level, message) {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + 
                   now.getMilliseconds().toString().padStart(3, '0');
      
      logs.push({ time, level, message });
      
      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }
      
      renderLogs();
    }

    function renderLogs() {
      const container = document.getElementById('logs-content');
      const searchTerm = document.getElementById('search-input').value.toLowerCase();
      
      let filtered = logs;
      if (currentFilter !== 'all') {
        filtered = logs.filter(l => l.level === currentFilter);
      }
      if (searchTerm) {
        filtered = filtered.filter(l => l.message.toLowerCase().includes(searchTerm));
      }

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 12h8"/><path d="M13 18h8"/><path d="M13 6h8"/><path d="M3 12h1"/><path d="M3 18h1"/><path d="M3 6h1"/><path d="M8 12h1"/><path d="M8 18h1"/><path d="M8 6h1"/></svg>
            <h3>No logs yet</h3>
            <p>Logs will appear here as events occur</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(log => \`
        <div class="log-entry">
          <span class="log-time">\${log.time}</span>
          <span class="log-level \${log.level}">\${log.level}</span>
          <span class="log-message">\${escapeHtml(log.message)}</span>
        </div>
      \`).join('');

      if (autoScroll) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === filter || (filter === 'all' && btn.textContent === 'All'));
      });
      renderLogs();
    }

    function filterLogs() {
      renderLogs();
    }

    function toggleAutoScroll() {
      autoScroll = !autoScroll;
      document.getElementById('autoscroll-icon').textContent = autoScroll ? '⏸' : '▶';
    }

    function clearLogs() {
      logs = [];
      renderLogs();
      addLog('info', 'Logs cleared');
    }

    function downloadLogs() {
      const content = logs.map(l => \`[\${l.time}] [\${l.level.toUpperCase()}] \${l.message}\`).join('\\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openqa-logs-' + new Date().toISOString().split('T')[0] + '.txt';
      a.click();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Add some initial logs
    addLog('info', 'OpenQA Logs initialized');
    addLog('info', 'Connecting to WebSocket...');
    
    // Initialize WebSocket
    initWebSocket();

    // Fetch initial activity from API
    fetch('/api/sessions?limit=5', { credentials: 'include' })
      .then(r => r.json())
      .then(sessions => {
        sessions.forEach(s => {
          // Show the unique part after the "session_" prefix (or last 12 chars)
          const shortId = s.id.startsWith('session_') ? s.id.substring(8, 20) : s.id.substring(0, 12);
          const status = s.status || 'completed';
          const started = s.started_at ? new Date(s.started_at).toLocaleTimeString() : '';
          addLog('info', \`Session \${shortId} [\${status}] — \${s.total_actions || 0} actions, \${s.bugs_found || 0} bugs\${started ? ' @ ' + started : ''}\`);
        });
      })
      .catch(() => {});
  </script>
</body>
</html>`;
}
