import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getTestsHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'tests' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Sessions</title>
  ${getFontsLink()}
  <style>
    ${getBaseStyles()}

    .btn {
      padding: 10px 16px; border-radius: 8px; font-family: var(--sans);
      font-size: 13px; font-weight: 600; cursor: pointer; border: none;
      transition: all 0.15s; text-decoration: none;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-ghost { background: var(--panel); color: var(--text-2); border: 1px solid var(--border-hi); }
    .btn-ghost:hover { color: var(--text-1); }

    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
    }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px;
    }
    .stat-label { font-size: 12px; color: var(--text-3); margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: 800; }
    .stat-value.green { color: var(--green); }
    .stat-value.red { color: var(--red); }
    .stat-value.yellow { color: var(--yellow); }
    .stat-value.blue { color: var(--blue); }
    .progress-bar { height: 8px; background: var(--panel); border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: var(--green); transition: width 0.3s; }

    /* Session selector */
    .session-selector {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .session-selector label { font-size: 13px; font-weight: 600; color: var(--text-2); }
    .session-selector select {
      background: var(--panel); border: 1px solid var(--border-hi);
      color: var(--text-1); border-radius: 8px; padding: 8px 12px;
      font-family: var(--mono); font-size: 12px; cursor: pointer; flex: 1; max-width: 480px;
    }

    /* Filters */
    .filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-btn {
      padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: var(--panel); color: var(--text-2); border: 1px solid var(--border);
      cursor: pointer; transition: all 0.15s;
    }
    .filter-btn:hover { color: var(--text-1); }
    .filter-btn.active { background: var(--accent-lo); color: var(--accent); border-color: var(--accent); }

    /* Actions table */
    .actions-table {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
    }
    .table-header {
      display: grid; grid-template-columns: 160px 1fr 100px 120px;
      padding: 12px 16px; background: var(--panel);
      font-size: 11px; font-weight: 700; color: var(--text-3);
      text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border);
    }
    .table-row {
      display: grid; grid-template-columns: 160px 1fr 100px 120px;
      padding: 13px 16px; border-bottom: 1px solid var(--border);
      font-size: 13px; align-items: start; transition: background 0.15s;
    }
    .table-row:hover { background: var(--panel); }
    .table-row:last-child { border-bottom: none; }

    .action-type {
      font-family: var(--mono); font-size: 11px; font-weight: 600;
      padding: 3px 8px; border-radius: 5px; display: inline-block; white-space: nowrap;
    }
    .type-navigate    { background: #1e3a5f; color: #60a5fa; }
    .type-click       { background: #1c3a2e; color: #4ade80; }
    .type-fill        { background: #2d2a1e; color: #facc15; }
    .type-screenshot  { background: #2a1e3f; color: #a78bfa; }
    .type-specialist  { background: #3f1e1e; color: #f87171; }
    .type-specialist-ok { background: #1e3a2e; color: #4ade80; }
    .type-tool        { background: #1e2a3f; color: #93c5fd; }
    .type-error       { background: #3f1e1e; color: #f87171; }
    .type-default     { background: var(--panel); color: var(--text-2); }

    .action-desc { font-size: 13px; color: var(--text-1); line-height: 1.4; }
    .action-output {
      margin-top: 4px; font-size: 11px; font-family: var(--mono);
      color: var(--text-3); max-width: 640px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600;
    }
    .status-badge.ok   { background: var(--green-lo); color: var(--green); }
    .status-badge.err  { background: var(--red-lo); color: var(--red); }
    .status-badge.warn { background: var(--yellow-lo); color: var(--yellow); }
    .status-badge.info { background: var(--blue-lo); color: var(--blue); }

    .empty-state {
      text-align: center; padding: 60px 20px; color: var(--text-3);
    }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Session Actions</div>
          <div class="page-breadcrumb">openqa / overview / actions</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadSessions()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="startSession()">▶ New Session</button>
        </div>
      </div>

      <div class="content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Actions</div>
            <div class="stat-value" id="total-actions">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Specialists OK</div>
            <div class="stat-value green" id="specialists-ok">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Specialists Failed</div>
            <div class="stat-value red" id="specialists-failed">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Bugs Found</div>
            <div class="stat-value yellow" id="bugs-found">0</div>
            <div class="progress-bar">
              <div class="progress-fill" id="pass-rate-bar" style="width:0%;background:var(--yellow)"></div>
            </div>
          </div>
        </div>

        <div class="session-selector">
          <label>Session</label>
          <select id="session-select" onchange="loadActions(this.value)">
            <option value="">— select a session —</option>
          </select>
        </div>

        <div class="filters">
          <button class="filter-btn active" onclick="filterActions('all')">All</button>
          <button class="filter-btn" onclick="filterActions('specialist')">Specialists</button>
          <button class="filter-btn" onclick="filterActions('navigate')">Navigation</button>
          <button class="filter-btn" onclick="filterActions('error')">Errors</button>
        </div>

        <div class="actions-table">
          <div class="table-header">
            <div>Type</div>
            <div>Description</div>
            <div>Status</div>
            <div>Time</div>
          </div>
          <div id="actions-list">
            <div class="empty-state">
              <h3>Select a session above</h3>
              <p>Or start a new session to see live actions</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    let allActions = [];
    let currentFilter = 'all';

    // ── Action type → CSS class mapping ────────────────────────────────────────
    function typeClass(type) {
      if (!type) return 'type-default';
      const t = type.toLowerCase();
      if (t.includes('specialist') && (t.includes('complete') || t.includes('finish'))) return 'type-specialist-ok';
      if (t.includes('specialist') && t.includes('fail'))   return 'type-error';
      if (t.includes('specialist')) return 'type-specialist';
      if (t === 'navigate')  return 'type-navigate';
      if (t === 'click')     return 'type-click';
      if (t === 'fill')      return 'type-fill';
      if (t === 'screenshot') return 'type-screenshot';
      if (t.includes('error') || t.includes('fail')) return 'type-error';
      if (t.includes('tool')) return 'type-tool';
      return 'type-default';
    }

    function statusBadge(type, output) {
      const t = (type || '').toLowerCase();
      const o = (output || '').toLowerCase();
      if (t.includes('fail') || t.includes('error') || o.includes('error') || o.includes('failed'))
        return '<span class="status-badge err">✗ error</span>';
      if (t.includes('specialist') && t.includes('complete'))
        return '<span class="status-badge ok">✓ done</span>';
      if (t.includes('specialist') && t.includes('start'))
        return '<span class="status-badge info">● running</span>';
      if (t.includes('screenshot') || t.includes('navigate') || t.includes('click'))
        return '<span class="status-badge ok">✓ ok</span>';
      return '<span class="status-badge info">—</span>';
    }

    function formatType(type) {
      if (!type) return 'unknown';
      // Shorten specialist types for display: "specialist:github-code-reviewer:complete" → "specialist · github-code-reviewer · done"
      return type.replace(/:/g, ' · ').replace(/_/g, '-');
    }

    // ── Load session list ───────────────────────────────────────────────────────
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions?limit=20', { credentials: 'include' });
        const sessions = await res.json();
        const sel = document.getElementById('session-select');
        sel.innerHTML = '<option value="">— select a session —</option>';
        sessions.forEach((s, i) => {
          const label = s.id + ' · ' + (s.status || 'unknown') + ' · ' + formatDate(s.started_at);
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = 'Session ' + (i + 1) + ' — ' + label;
          if (s.bugs_found > 0) opt.textContent += ' · ' + s.bugs_found + ' bugs';
          sel.appendChild(opt);
        });

        // Auto-select most recent session
        if (sessions.length > 0) {
          sel.value = sessions[0].id;
          await loadActions(sessions[0].id);
        }
      } catch (e) {
        console.error('Failed to load sessions', e);
      }
    }

    // ── Load actions for a session ──────────────────────────────────────────────
    async function loadActions(sessionId) {
      if (!sessionId) return;
      try {
        const [actionsRes, bugsRes] = await Promise.all([
          fetch('/api/sessions/' + sessionId + '/actions', { credentials: 'include' }),
          fetch('/api/bugs', { credentials: 'include' }),
        ]);
        allActions = await actionsRes.json();
        const bugs = await bugsRes.json();
        const sessionBugs = bugs.filter(b => b.session_id === sessionId);

        updateStats(sessionBugs);
        renderActions();
      } catch (e) {
        console.error('Failed to load actions', e);
      }
    }

    function updateStats(bugs) {
      const total = allActions.length;
      const specialistOk = allActions.filter(a =>
        (a.type || '').includes('specialist') && (a.type || '').includes('complete')).length;
      const specialistFail = allActions.filter(a =>
        (a.type || '').includes('specialist') && (a.type || '').includes('fail')).length;
      const bugsFound = bugs.length;

      document.getElementById('total-actions').textContent   = total;
      document.getElementById('specialists-ok').textContent   = specialistOk;
      document.getElementById('specialists-failed').textContent = specialistFail;
      document.getElementById('bugs-found').textContent      = bugsFound;

      const maxBugs = Math.max(bugsFound, 1);
      document.getElementById('pass-rate-bar').style.width = Math.min(100, bugsFound * 10) + '%';
    }

    function renderActions() {
      const container = document.getElementById('actions-list');

      let filtered = allActions;
      if (currentFilter === 'specialist') {
        filtered = allActions.filter(a => (a.type || '').includes('specialist'));
      } else if (currentFilter === 'navigate') {
        filtered = allActions.filter(a => ['navigate', 'click', 'fill', 'screenshot'].includes(a.type));
      } else if (currentFilter === 'error') {
        filtered = allActions.filter(a => {
          const t = (a.type || '').toLowerCase();
          const o = (a.output || '').toLowerCase();
          return t.includes('fail') || t.includes('error') || o.includes('error');
        });
      }

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <h3>No actions found</h3>
            <p>\${currentFilter === 'all' ? 'This session has no recorded actions' : 'No ' + currentFilter + ' actions in this session'}</p>
          </div>\`;
        return;
      }

      container.innerHTML = filtered.map(action => {
        const tc = typeClass(action.type);
        const typeLabel = formatType(action.type);
        const desc = action.description || action.input || '—';
        const out  = action.output ? action.output.slice(0, 120) + (action.output.length > 120 ? '…' : '') : '';
        const time = action.created_at ? formatDate(action.created_at) : '—';
        return \`
          <div class="table-row">
            <div><span class="action-type \${tc}">\${escHtml(typeLabel)}</span></div>
            <div>
              <div class="action-desc">\${escHtml(desc)}</div>
              \${out ? '<div class="action-output">' + escHtml(out) + '</div>' : ''}
            </div>
            <div>\${statusBadge(action.type, action.output)}</div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--text-3)">\${time}</div>
          </div>\`;
      }).join('');
    }

    function filterActions(filter) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        const label = btn.textContent.toLowerCase().replace(' ', '');
        btn.classList.toggle('active', label === filter || (filter === 'all' && btn.textContent === 'All'));
      });
      renderActions();
    }

    async function startSession() {
      try {
        const res = await fetch('/api/agent/start', { method: 'POST', credentials: 'include' });
        const r = await res.json();
        if (r.success) { setTimeout(loadSessions, 1500); }
        else { alert(r.error || 'Failed to start session'); }
      } catch { alert('Failed to start session'); }
    }

    function formatDate(dateStr) {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
           + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── WebSocket for realtime action streaming ─────────────────────────────────
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + window.location.host);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'action') {
            // Append new action live if it belongs to the selected session
            const sel = document.getElementById('session-select');
            if (sel.value && msg.data?.session_id === sel.value) {
              allActions.unshift(msg.data);
              renderActions();
            }
          } else if (msg.type === 'sessions') {
            // Refresh session list on session changes
            loadSessions();
          }
        } catch {}
      };
      ws.onclose = () => setTimeout(initWebSocket, 3000);
    }

    loadSessions();
    initWebSocket();
  </script>
</body>
</html>`;
}
