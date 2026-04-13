import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getSessionDetailHTML(sessionId: string): string {
  const sidebar = getSidebarHTML({ activePage: 'sessions' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Details - OpenQA</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}
    
    body {
      display: flex;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background: #0f1419;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .main-content {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
      max-width: 100%;
    }
    
    .session-header {
      background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .session-header h1 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #fff;
    }
    
    .session-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .meta-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .meta-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    
    .meta-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
    }
    
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-badge.running {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    
    .status-badge.completed {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }
    
    .status-badge.failed {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    
    .actions-section {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
    }
    
    .filter-tabs {
      display: flex;
      gap: 0.5rem;
    }
    
    .filter-tab {
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
    }
    
    .filter-tab:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    
    .filter-tab.active {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;
    }
    
    .actions-timeline {
      position: relative;
      padding-left: 2rem;
    }
    
    .actions-timeline::before {
      content: '';
      position: absolute;
      left: 0.5rem;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(180deg, #3b82f6 0%, rgba(59, 130, 246, 0.1) 100%);
    }
    
    .action-item {
      position: relative;
      margin-bottom: 1.5rem;
      background: rgba(255, 255, 255, 0.03);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s;
    }
    
    .action-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(59, 130, 246, 0.3);
    }
    
    .action-item::before {
      content: '';
      position: absolute;
      left: -1.5rem;
      top: 1.25rem;
      width: 10px;
      height: 10px;
      background: #3b82f6;
      border-radius: 50%;
      border: 2px solid #1a1f2e;
    }
    
    .action-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    
    .action-type {
      font-weight: 600;
      color: #3b82f6;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .action-time {
      font-size: 0.75rem;
      color: #64748b;
    }
    
    .action-description {
      color: #cbd5e1;
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
    
    .action-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .action-detail {
      font-size: 0.75rem;
    }
    
    .action-detail-label {
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    
    .action-detail-value {
      color: #94a3b8;
      font-family: 'Courier New', monospace;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      word-break: break-all;
      max-height: 100px;
      overflow-y: auto;
    }
    
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }
    
    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    
    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      text-decoration: none;
      transition: all 0.2s;
      margin-bottom: 1rem;
    }
    
    .back-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  </style>
</head>
<body>
  ${sidebar}
  
  <main class="main-content">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <a href="/sessions" class="back-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Sessions
      </a>
      
      <div style="display: flex; gap: 0.5rem;">
        <button onclick="downloadReport('html')" class="btn btn-primary" style="padding: 8px 16px; font-size: 13px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Download Report (HTML)
        </button>
        <button onclick="downloadReport('json')" class="btn btn-ghost" style="padding: 8px 16px; font-size: 13px;">
          Download JSON
        </button>
      </div>
    </div>
    
    <div class="session-header" id="session-header">
      <h1>Session Details</h1>
      <div class="session-meta" id="session-meta">
        <div class="meta-item">
          <div class="meta-label">Status</div>
          <div class="meta-value"><span class="status-badge">Loading...</span></div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Total Actions</div>
          <div class="meta-value">-</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Bugs Found</div>
          <div class="meta-value">-</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div class="meta-value">-</div>
        </div>
      </div>
    </div>
    
    <div class="actions-section">
      <div class="section-header">
        <h2 class="section-title">Actions Timeline</h2>
        <div class="filter-tabs">
          <button class="filter-tab active" data-filter="all">All</button>
          <button class="filter-tab" data-filter="specialist">Specialists</button>
          <button class="filter-tab" data-filter="navigate">Navigation</button>
          <button class="filter-tab" data-filter="test">Tests</button>
        </div>
      </div>
      
      <div class="actions-timeline" id="actions-timeline">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke-width="2"/>
          </svg>
          <p>Loading actions...</p>
        </div>
      </div>
    </div>
  </main>

  <script>
    const sessionId = '${sessionId}';
    let allActions = [];
    let currentFilter = 'all';

    async function loadSessionDetails() {
      try {
        const [sessionRes, actionsRes] = await Promise.all([
          fetch(\`/api/sessions/\${sessionId}\`, { credentials: 'include' }),
          fetch(\`/api/sessions/\${sessionId}/actions\`, { credentials: 'include' })
        ]);

        if (!sessionRes.ok || !actionsRes.ok) {
          throw new Error('Failed to load session details');
        }

        const session = await sessionRes.json();
        const actions = await actionsRes.json();

        allActions = actions;
        renderSessionMeta(session);
        renderActions(actions);
      } catch (error) {
        console.error('Error loading session:', error);
        document.getElementById('actions-timeline').innerHTML = \`
          <div class="empty-state">
            <p>Error loading session details</p>
          </div>
        \`;
      }
    }

    function renderSessionMeta(session) {
      const duration = session.ended_at 
        ? formatDuration(new Date(session.ended_at) - new Date(session.started_at))
        : formatDuration(Date.now() - new Date(session.started_at));

      document.getElementById('session-meta').innerHTML = \`
        <div class="meta-item">
          <div class="meta-label">Status</div>
          <div class="meta-value"><span class="status-badge \${session.status}">\${session.status}</span></div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Total Actions</div>
          <div class="meta-value">\${session.total_actions || 0}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Bugs Found</div>
          <div class="meta-value">\${session.bugs_found || 0}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div class="meta-value">\${duration}</div>
        </div>
      \`;
    }

    function renderActions(actions) {
      const timeline = document.getElementById('actions-timeline');
      
      if (!actions || actions.length === 0) {
        timeline.innerHTML = \`
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <path d="M12 8v4M12 16h.01" stroke-width="2"/>
            </svg>
            <p>No actions recorded for this session</p>
          </div>
        \`;
        return;
      }

      timeline.innerHTML = actions.map(action => \`
        <div class="action-item" data-type="\${action.type}">
          <div class="action-header">
            <span class="action-type">\${action.type}</span>
            <span class="action-time">\${formatTime(action.timestamp)}</span>
          </div>
          <div class="action-description">\${action.description || 'No description'}</div>
          \${action.input || action.output ? \`
            <div class="action-details">
              \${action.input ? \`
                <div class="action-detail">
                  <div class="action-detail-label">Input</div>
                  <div class="action-detail-value">\${truncate(action.input, 100)}</div>
                </div>
              \` : ''}
              \${action.output ? \`
                <div class="action-detail">
                  <div class="action-detail-label">Output</div>
                  <div class="action-detail-value">\${truncate(action.output, 100)}</div>
                </div>
              \` : ''}
            </div>
          \` : ''}
        </div>
      \`).join('');
    }

    function filterActions(filter) {
      currentFilter = filter;
      
      document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
      });

      let filtered = allActions;
      
      if (filter === 'specialist') {
        filtered = allActions.filter(a => a.type?.startsWith('specialist:'));
      } else if (filter === 'navigate') {
        filtered = allActions.filter(a => a.type === 'navigate' || a.type === 'click' || a.type === 'screenshot');
      } else if (filter === 'test') {
        filtered = allActions.filter(a => a.type?.includes('test'));
      }

      renderActions(filtered);
    }

    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }

    function formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return \`\${hours}h \${minutes % 60}m\`;
      } else if (minutes > 0) {
        return \`\${minutes}m \${seconds % 60}s\`;
      } else {
        return \`\${seconds}s\`;
      }
    }

    function truncate(str, maxLen) {
      if (!str) return '';
      if (str.length <= maxLen) return str;
      return str.substring(0, maxLen) + '...';
    }

    function downloadReport(format) {
      const url = \`/api/reports/\${sessionId}/download/\${format}\`;
      window.location.href = url;
    }

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        filterActions(tab.dataset.filter);
      });
    });

    loadSessionDetails();
  </script>
</body>
</html>`;
}
