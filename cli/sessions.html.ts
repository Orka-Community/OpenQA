import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getSessionsHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'sessions' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Sessions</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}

    /* Page-specific styles */
    .btn {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-ghost { background: var(--panel); color: var(--text-2); border: 1px solid var(--border-hi); }
    .btn-ghost:hover { color: var(--text-1); background: var(--surface); }

    /* Sessions Table */
    .sessions-table {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .table-header {
      display: grid;
      grid-template-columns: 1fr 120px 100px 100px 100px 120px 80px;
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
      grid-template-columns: 1fr 120px 100px 100px 100px 120px 80px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      align-items: center;
      transition: background 0.15s;
    }
    .table-row:hover { background: var(--panel); }
    .table-row:last-child { border-bottom: none; }

    .session-id {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--accent);
    }
    .session-date {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text-2);
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.running { background: var(--green-lo); color: var(--green); }
    .status-badge.completed { background: var(--blue-lo); color: var(--blue); }
    .status-badge.failed { background: var(--red-lo); color: var(--red); }
    .status-badge.stopped { background: var(--yellow-lo); color: var(--yellow); }

    /* Stats */
    .stat-value { font-weight: 700; }
    .stat-value.green { color: var(--green); }
    .stat-value.red { color: var(--red); }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }
    .empty-state p { font-size: 13px; }

    /* Filters */
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

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding: 12px 0;
    }
    .pagination-info { font-size: 13px; color: var(--text-3); }
    .pagination-btns { display: flex; gap: 8px; }

    /* Sidebar footer */
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <!-- Main -->
    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Sessions</div>
          <div class="page-breadcrumb">openqa / testing / sessions</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadSessions()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="startNewSession()">▶ New Session</button>
        </div>
      </div>
    <div class="content">
      <!-- Filters -->
      <div class="filters">
        <button class="filter-btn active" onclick="filterSessions('all')">All</button>
        <button class="filter-btn" onclick="filterSessions('running')">Running</button>
        <button class="filter-btn" onclick="filterSessions('completed')">Completed</button>
        <button class="filter-btn" onclick="filterSessions('failed')">Failed</button>
      </div>

      <!-- Sessions Table -->
      <div class="sessions-table">
        <div class="table-header">
          <div>Session ID</div>
          <div>Started</div>
          <div>Status</div>
          <div>Actions</div>
          <div>Bugs</div>
          <div>Duration</div>
          <div>Actions</div>
        </div>
        <div id="sessions-list">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
            <h3>No sessions yet</h3>
            <p>Start a new session to begin testing</p>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" id="pagination" style="display: none;">
        <div class="pagination-info" id="pagination-info">Showing 1-10 of 0 sessions</div>
        <div class="pagination-btns">
          <button class="btn btn-ghost" id="prev-btn" onclick="prevPage()">← Previous</button>
          <button class="btn btn-ghost" id="next-btn" onclick="nextPage()">Next →</button>
        </div>
      </div>
      </div>
    </main>
  </div>

  <script>
    let sessions = [];
    let currentFilter = 'all';
    let currentPage = 1;
    const pageSize = 10;

    async function loadSessions() {
      try {
        const response = await fetch('/api/sessions?limit=100', { credentials: 'include' });
        sessions = await response.json();
        renderSessions();
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }

    function renderSessions() {
      const container = document.getElementById('sessions-list');
      const pagination = document.getElementById('pagination');
      
      let filtered = sessions;
      if (currentFilter !== 'all') {
        filtered = sessions.filter(s => s.status === currentFilter);
      }

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
            <h3>No sessions found</h3>
            <p>\${currentFilter === 'all' ? 'Start a new session to begin testing' : 'No ' + currentFilter + ' sessions'}</p>
          </div>
        \`;
        pagination.style.display = 'none';
        return;
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const paginated = filtered.slice(start, end);

      container.innerHTML = paginated.map(session => \`
        <div class="table-row">
          <div class="session-id">\${session.id.substring(0, 12)}...</div>
          <div class="session-date">\${formatDate(session.started_at)}</div>
          <div><span class="status-badge \${session.status || 'completed'}">\${session.status || 'completed'}</span></div>
          <div class="stat-value">\${session.total_actions || 0}</div>
          <div class="stat-value \${(session.bugs_found || 0) > 0 ? 'red' : 'green'}">\${session.bugs_found || 0}</div>
          <div class="session-date">\${formatDuration(session.started_at, session.ended_at)}</div>
          <div>
            <button class="btn btn-ghost" style="padding: 6px 10px; font-size: 11px;" onclick="viewSession('\${session.id}')">View</button>
          </div>
        </div>
      \`).join('');

      // Update pagination
      const totalPages = Math.ceil(filtered.length / pageSize);
      pagination.style.display = totalPages > 1 ? 'flex' : 'none';
      document.getElementById('pagination-info').textContent = \`Showing \${start + 1}-\${Math.min(end, filtered.length)} of \${filtered.length} sessions\`;
      document.getElementById('prev-btn').disabled = currentPage === 1;
      document.getElementById('next-btn').disabled = currentPage >= totalPages;
    }

    function filterSessions(filter) {
      currentFilter = filter;
      currentPage = 1;
      
      // Update filter buttons
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === filter || (filter === 'all' && btn.textContent === 'All'));
      });
      
      renderSessions();
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderSessions();
      }
    }

    function nextPage() {
      currentPage++;
      renderSessions();
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDuration(start, end) {
      if (!start) return '-';
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      const diff = Math.floor((endDate - startDate) / 1000);
      
      if (diff < 60) return diff + 's';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ' + (diff % 60) + 's';
      return Math.floor(diff / 3600) + 'h ' + Math.floor((diff % 3600) / 60) + 'm';
    }

    async function startNewSession() {
      try {
        const response = await fetch('/api/agent/start', { method: 'POST', credentials: 'include' });
        const result = await response.json();
        if (result.success) {
          loadSessions();
        } else {
          alert(result.error || 'Failed to start session');
        }
      } catch (error) {
        alert('Failed to start session');
      }
    }

    function viewSession(id) {
      // For now, just go to dashboard - could expand to session detail view
      window.location.href = '/?session=' + id;
    }

    // Load on page load
    loadSessions();
  </script>
</body>
</html>`;
}
