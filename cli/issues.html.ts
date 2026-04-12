import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getIssuesHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'issues' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Issues</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}
    --purple: #a855f7;
    --purple-lo: rgba(168,85,247,0.12);

    /* Buttons */
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
    .btn-primary:hover { opacity: 0.9; }
    .btn-ghost { background: var(--panel); color: var(--text-2); border: 1px solid var(--border-hi); }
    .btn-ghost:hover { color: var(--text-1); background: var(--surface); }
    .btn-danger { background: var(--red); color: #fff; }

    /* Stats Cards */
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
    .stat-value.red { color: var(--red); }
    .stat-value.yellow { color: var(--yellow); }
    .stat-value.green { color: var(--green); }
    .stat-value.blue { color: var(--blue); }

    /* Issues List */
    .issues-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .issue-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.15s;
    }
    .issue-card:hover { border-color: var(--border-hi); }
    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .issue-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-1);
      margin-bottom: 4px;
    }
    .issue-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--text-3);
      font-family: var(--mono);
    }
    .issue-description {
      font-size: 13px;
      color: var(--text-2);
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .issue-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .issue-tags {
      display: flex;
      gap: 8px;
    }
    .issue-tag {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: var(--panel);
      color: var(--text-2);
    }
    .issue-tag.critical { background: var(--red-lo); color: var(--red); }
    .issue-tag.high { background: var(--yellow-lo); color: var(--yellow); }
    .issue-tag.medium { background: var(--blue-lo); color: var(--blue); }
    .issue-tag.low { background: var(--green-lo); color: var(--green); }
    .issue-tag.ui { background: var(--purple-lo); color: var(--purple); }
    .issue-tag.api { background: var(--accent-lo); color: var(--accent); }

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
    .status-badge.open { background: var(--red-lo); color: var(--red); }
    .status-badge.investigating { background: var(--yellow-lo); color: var(--yellow); }
    .status-badge.fixed { background: var(--green-lo); color: var(--green); }
    .status-badge.wontfix { background: var(--panel); color: var(--text-3); }

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

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }
    .empty-state p { font-size: 13px; }

    /* Sidebar footer */
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title { font-size: 18px; font-weight: 700; }
    .modal-close {
      background: none;
      border: none;
      color: var(--text-3);
      cursor: pointer;
      font-size: 20px;
    }
    .modal-body { padding: 24px; }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
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
          <div class="page-title">Issues</div>
          <div class="page-breadcrumb">openqa / overview / issues</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadIssues()">↻ Refresh</button>
          <button class="btn btn-ghost" onclick="exportIssues()">Export</button>
        </div>
      </div>

      <div class="content">
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Issues</div>
          <div class="stat-value" id="total-issues">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Critical</div>
          <div class="stat-value red" id="critical-issues">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Open</div>
          <div class="stat-value yellow" id="open-issues">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Fixed</div>
          <div class="stat-value green" id="fixed-issues">0</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <button class="filter-btn active" onclick="filterIssues('all')">All</button>
        <button class="filter-btn" onclick="filterIssues('open')">Open</button>
        <button class="filter-btn" onclick="filterIssues('investigating')">Investigating</button>
        <button class="filter-btn" onclick="filterIssues('fixed')">Fixed</button>
        <button class="filter-btn" onclick="filterIssues('critical')">Critical</button>
      </div>

      <!-- Issues List -->
      <div class="issues-list" id="issues-list">
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <h3>No issues found</h3>
          <p>Great! No bugs have been detected yet</p>
        </div>
      </div>
    </main>
  </div>

  <!-- Issue Detail Modal -->
  <div class="modal-overlay" id="issue-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title" id="modal-title">Issue Details</div>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" id="modal-body">
        <!-- Content loaded dynamically -->
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="markAsFixed()">Mark as Fixed</button>
      </div>
    </div>
  </div>

  <script>
    let issues = [];
    let currentFilter = 'all';
    let selectedIssue = null;

    async function loadIssues() {
      try {
        const [bugsRes, issuesRes] = await Promise.all([
          fetch('/api/bugs', { credentials: 'include' }),
          fetch('/api/issues', { credentials: 'include' })
        ]);
        
        const bugs = await bugsRes.json();
        const apiIssues = await issuesRes.json();
        
        // Combine bugs and issues
        issues = [
          ...bugs.map(b => ({
            id: b.id,
            title: b.title || 'Bug detected',
            description: b.description || b.details || 'No description',
            severity: b.severity || 'medium',
            status: b.status || 'open',
            type: b.type || 'ui',
            url: b.url,
            created_at: b.created_at || b.timestamp,
            session_id: b.session_id
          })),
          ...apiIssues.map(i => ({
            id: i.id,
            title: i.title || 'Issue detected',
            description: i.description || i.details || 'No description',
            severity: i.severity || 'medium',
            status: i.status || 'open',
            type: i.type || 'api',
            url: i.url,
            created_at: i.created_at || i.timestamp,
            session_id: i.session_id
          }))
        ];
        
        updateStats();
        renderIssues();
      } catch (error) {
        console.error('Failed to load issues:', error);
      }
    }

    function updateStats() {
      document.getElementById('total-issues').textContent = issues.length;
      document.getElementById('critical-issues').textContent = issues.filter(i => i.severity === 'critical').length;
      document.getElementById('open-issues').textContent = issues.filter(i => i.status === 'open').length;
      document.getElementById('fixed-issues').textContent = issues.filter(i => i.status === 'fixed').length;
    }

    function renderIssues() {
      const container = document.getElementById('issues-list');
      
      let filtered = issues;
      if (currentFilter === 'critical') {
        filtered = issues.filter(i => i.severity === 'critical');
      } else if (currentFilter !== 'all') {
        filtered = issues.filter(i => i.status === currentFilter);
      }

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <h3>No issues found</h3>
            <p>\${currentFilter === 'all' ? 'Great! No bugs have been detected yet' : 'No ' + currentFilter + ' issues'}</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(issue => \`
        <div class="issue-card" onclick="viewIssue('\${issue.id}')">
          <div class="issue-header">
            <div>
              <div class="issue-title">\${escapeHtml(issue.title)}</div>
              <div class="issue-meta">
                <span>#\${issue.id.substring(0, 8)}</span>
                <span>\${formatDate(issue.created_at)}</span>
                \${issue.url ? '<span>' + truncateUrl(issue.url) + '</span>' : ''}
              </div>
            </div>
            <span class="status-badge \${issue.status}">\${issue.status}</span>
          </div>
          <div class="issue-description">\${escapeHtml(truncate(issue.description, 200))}</div>
          <div class="issue-footer">
            <div class="issue-tags">
              <span class="issue-tag \${issue.severity}">\${issue.severity}</span>
              <span class="issue-tag \${issue.type}">\${issue.type}</span>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function filterIssues(filter) {
      currentFilter = filter;
      
      document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnFilter = btn.textContent.toLowerCase();
        btn.classList.toggle('active', btnFilter === filter || (filter === 'all' && btn.textContent === 'All'));
      });
      
      renderIssues();
    }

    function viewIssue(id) {
      selectedIssue = issues.find(i => i.id === id);
      if (!selectedIssue) return;

      document.getElementById('modal-title').textContent = selectedIssue.title;
      document.getElementById('modal-body').innerHTML = \`
        <div style="margin-bottom: 16px;">
          <span class="status-badge \${selectedIssue.status}">\${selectedIssue.status}</span>
          <span class="issue-tag \${selectedIssue.severity}" style="margin-left: 8px;">\${selectedIssue.severity}</span>
          <span class="issue-tag \${selectedIssue.type}" style="margin-left: 8px;">\${selectedIssue.type}</span>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--text-3); margin-bottom: 4px;">Description</div>
          <div style="font-size: 14px; color: var(--text-2); line-height: 1.6;">\${escapeHtml(selectedIssue.description)}</div>
        </div>
        \${selectedIssue.url ? \`
          <div style="margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--text-3); margin-bottom: 4px;">URL</div>
            <a href="\${selectedIssue.url}" target="_blank" style="font-size: 13px; color: var(--accent); font-family: var(--mono);">\${selectedIssue.url}</a>
          </div>
        \` : ''}
        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--text-3); margin-bottom: 4px;">Detected</div>
          <div style="font-size: 13px; color: var(--text-2); font-family: var(--mono);">\${formatDate(selectedIssue.created_at)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--text-3); margin-bottom: 4px;">Issue ID</div>
          <div style="font-size: 13px; color: var(--text-2); font-family: var(--mono);">\${selectedIssue.id}</div>
        </div>
      \`;
      
      document.getElementById('issue-modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('issue-modal').classList.remove('active');
      selectedIssue = null;
    }

    async function markAsFixed() {
      if (!selectedIssue) return;
      
      try {
        await fetch(\`/api/bugs/\${selectedIssue.id}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'fixed' })
        });
        
        selectedIssue.status = 'fixed';
        closeModal();
        loadIssues();
      } catch (error) {
        console.error('Failed to update issue:', error);
      }
    }

    function exportIssues() {
      const csv = [
        ['ID', 'Title', 'Description', 'Severity', 'Status', 'Type', 'URL', 'Created'].join(','),
        ...issues.map(i => [
          i.id,
          '"' + (i.title || '').replace(/"/g, '""') + '"',
          '"' + (i.description || '').replace(/"/g, '""') + '"',
          i.severity,
          i.status,
          i.type,
          i.url || '',
          i.created_at || ''
        ].join(','))
      ].join('\\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openqa-issues-' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + 
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function truncate(str, len) {
      if (!str) return '';
      return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function truncateUrl(url) {
      if (!url) return '';
      try {
        const u = new URL(url);
        return u.pathname.length > 30 ? u.pathname.substring(0, 30) + '...' : u.pathname;
      } catch {
        return url.substring(0, 30) + '...';
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Close modal on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Close modal on overlay click
    document.getElementById('issue-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) closeModal();
    });

    // Load on page load
    loadIssues();
  </script>
</body>
</html>`;
}
