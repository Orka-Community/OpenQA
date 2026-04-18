import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

export function getSchedulesHTML(): string {
  const sidebar = getSidebarHTML({ activePage: 'schedules' });
  const baseStyles = getBaseStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Schedules</title>
  ${getFontsLink()}
  <style>
    ${baseStyles}

    .schedule-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .schedule-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: border-color 0.15s;
    }
    .schedule-card:hover { border-color: var(--border-hi); }
    .schedule-card.disabled { opacity: 0.5; }

    .schedule-info { flex: 1; min-width: 0; }
    .schedule-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-1);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .schedule-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-3);
      flex-wrap: wrap;
    }
    .schedule-meta code {
      font-family: var(--mono);
      background: var(--panel);
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--accent);
    }
    .schedule-actions { display: flex; gap: 8px; flex-shrink: 0; }

    .toggle-btn {
      width: 40px;
      height: 22px;
      border-radius: 11px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .toggle-btn.on  { background: var(--green); }
    .toggle-btn.off { background: var(--text-3); }
    .toggle-btn::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      top: 3px;
      transition: left 0.2s;
    }
    .toggle-btn.on::after  { left: 21px; }
    .toggle-btn.off::after { left: 3px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      place-items: center;
      z-index: 200;
    }
    .modal-backdrop.open { display: grid; }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: 16px;
      padding: 28px 32px;
      width: 480px;
      max-width: 95vw;
    }
    .modal h3 { font-size: 18px; font-weight: 800; margin-bottom: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 12px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .form-group input {
      width: 100%;
      background: var(--panel);
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      color: var(--text-1);
      font-family: var(--sans);
    }
    .form-group input:focus { outline: none; border-color: var(--accent); }
    .form-group .hint { font-size: 11px; color: var(--text-3); margin-top: 4px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

    .cron-presets {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .cron-preset {
      font-size: 11px;
      font-family: var(--mono);
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--panel);
      border: 1px solid var(--border-hi);
      color: var(--text-2);
      cursor: pointer;
      transition: all 0.15s;
    }
    .cron-preset:hover { border-color: var(--accent); color: var(--accent); }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }
    .empty-state p  { font-size: 13px; max-width: 380px; margin: 0 auto; line-height: 1.6; }

    .info-bar {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-3);
      margin-bottom: 24px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .info-bar svg { flex-shrink: 0; margin-top: 1px; }
  </style>
</head>
<body>
  <div class="shell">
    ${sidebar}

    <main>
      <div class="topbar">
        <div>
          <div class="page-title">Schedules</div>
          <div class="page-breadcrumb">openqa / system / schedules</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadSchedules()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="openModal()">+ New Schedule</button>
        </div>
      </div>

      <div class="content">

        <div class="info-bar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          Schedules run autonomous QA sessions on a cron schedule. The daemon checks every 60 seconds.
          Standard cron syntax: <code style="font-family:var(--mono);color:var(--accent)">minute hour day month weekday</code>
        </div>

        <div class="schedule-grid" id="schedule-list">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3>No schedules yet</h3>
            <p>Create a schedule to automatically run QA sessions on a recurring basis.</p>
          </div>
        </div>

      </div>
    </main>
  </div>

  <!-- Create / Edit modal -->
  <div class="modal-backdrop" id="modal" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <h3 id="modal-title">New Schedule</h3>

      <div class="form-group">
        <label>Name</label>
        <input type="text" id="f-name" placeholder="Nightly regression">
      </div>

      <div class="form-group">
        <label>Target URL</label>
        <input type="url" id="f-url" placeholder="https://your-app.com or https://github.com/org/repo">
        <div class="hint">The URL that will be passed to the agent when this schedule fires.</div>
      </div>

      <div class="form-group">
        <label>Cron Expression</label>
        <input type="text" id="f-cron" placeholder="0 2 * * *">
        <div class="cron-presets">
          <span class="cron-preset" onclick="setCron('0 * * * *')">Every hour</span>
          <span class="cron-preset" onclick="setCron('0 2 * * *')">Daily 2 AM</span>
          <span class="cron-preset" onclick="setCron('0 2 * * 1')">Weekly Mon</span>
          <span class="cron-preset" onclick="setCron('0 9 * * 1-5')">Weekdays 9 AM</span>
          <span class="cron-preset" onclick="setCron('*/30 * * * *')">Every 30 min</span>
        </div>
        <div class="hint" id="cron-hint" style="margin-top:8px;color:var(--accent)"></div>
      </div>

      <div id="modal-error" style="color:var(--red);font-size:12px;margin-top:8px;display:none"></div>

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSchedule()" id="save-btn">Create</button>
      </div>
    </div>
  </div>

  <script>
    let schedules = [];
    let editingId = null;

    async function loadSchedules() {
      try {
        const res = await fetch('/api/schedules', { credentials: 'include' });
        schedules = await res.json();
        render();
      } catch (e) { console.error('Failed to load schedules', e); }
    }

    function render() {
      const container = document.getElementById('schedule-list');
      if (!schedules.length) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3>No schedules yet</h3>
            <p>Create a schedule to automatically run QA sessions on a recurring basis.</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = schedules.map(s => \`
        <div class="schedule-card \${s.enabled ? '' : 'disabled'}" id="card-\${s.id}">
          <button class="toggle-btn \${s.enabled ? 'on' : 'off'}" title="\${s.enabled ? 'Disable' : 'Enable'}" onclick="toggleSchedule('\${s.id}', \${s.enabled})"></button>
          <div class="schedule-info">
            <div class="schedule-name">\${escHtml(s.name)}</div>
            <div class="schedule-meta">
              <span>Cron: <code>\${escHtml(s.cron_expression)}</code></span>
              <span>Target: <a href="\${escHtml(s.target_url)}" target="_blank" style="color:var(--accent);text-decoration:none;">\${escHtml(truncate(s.target_url, 60))}</a></span>
              \${s.last_run_at ? '<span>Last run: ' + relTime(s.last_run_at) + '</span>' : '<span style="color:var(--text-3)">Never run</span>'}
            </div>
          </div>
          <div class="schedule-actions">
            <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="editSchedule('\${s.id}')">Edit</button>
            <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;color:var(--red)" onclick="deleteSchedule('\${s.id}')">Delete</button>
          </div>
        </div>
      \`).join('');
    }

    function openModal(id) {
      editingId = id || null;
      const s = id ? schedules.find(x => x.id === id) : null;
      document.getElementById('modal-title').textContent = s ? 'Edit Schedule' : 'New Schedule';
      document.getElementById('save-btn').textContent    = s ? 'Save' : 'Create';
      document.getElementById('f-name').value  = s?.name              || '';
      document.getElementById('f-url').value   = s?.target_url        || '';
      document.getElementById('f-cron').value  = s?.cron_expression   || '';
      document.getElementById('modal-error').style.display = 'none';
      document.getElementById('cron-hint').textContent = '';
      document.getElementById('modal').classList.add('open');
    }

    function editSchedule(id) { openModal(id); }

    function closeModal() {
      document.getElementById('modal').classList.remove('open');
      editingId = null;
    }

    function setCron(expr) {
      document.getElementById('f-cron').value = expr;
      document.getElementById('cron-hint').textContent = describeCron(expr);
    }

    document.getElementById('f-cron').addEventListener('input', e => {
      document.getElementById('cron-hint').textContent = describeCron(e.target.value);
    });

    async function saveSchedule() {
      const name = document.getElementById('f-name').value.trim();
      const url  = document.getElementById('f-url').value.trim();
      const cron = document.getElementById('f-cron').value.trim();
      const errEl = document.getElementById('modal-error');

      if (!name || !url || !cron) {
        errEl.textContent = 'All fields are required.';
        errEl.style.display = 'block';
        return;
      }

      const body = JSON.stringify({ name, target_url: url, cron_expression: cron, enabled: true });
      const method  = editingId ? 'PUT'  : 'POST';
      const endpoint = editingId ? '/api/schedules/' + editingId : '/api/schedules';

      try {
        const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errEl.textContent = err.error || 'Failed to save.';
          errEl.style.display = 'block';
          return;
        }
        closeModal();
        await loadSchedules();
      } catch (e) {
        errEl.textContent = 'Network error: ' + e.message;
        errEl.style.display = 'block';
      }
    }

    async function toggleSchedule(id, currentlyEnabled) {
      await fetch('/api/schedules/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });
      await loadSchedules();
    }

    async function deleteSchedule(id) {
      if (!confirm('Delete this schedule? This cannot be undone.')) return;
      await fetch('/api/schedules/' + id, { method: 'DELETE', credentials: 'include' });
      await loadSchedules();
    }

    function describeCron(expr) {
      if (!expr) return '';
      const parts = expr.trim().split(/\\s+/);
      if (parts.length !== 5) return 'Invalid cron — need 5 fields: minute hour day month weekday';
      const [min, hr, dom, mon, dow] = parts;
      if (min === '*' && hr === '*') return 'Runs every minute';
      if (min.startsWith('*/')) return 'Runs every ' + min.slice(2) + ' minutes';
      if (hr === '*') return 'Runs at minute ' + min + ' of every hour';
      const days = dow !== '*' ? ' on weekday(s) ' + dow : '';
      const doms = dom !== '*' ? ' on day ' + dom + ' of month' : '';
      return 'Runs at ' + hr.padStart(2,'0') + ':' + min.padStart(2,'0') + days + doms;
    }

    function relTime(iso) {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1)  return 'just now';
      if (m < 60) return m + 'm ago';
      const h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    }

    function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

    function escHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    loadSchedules();
  </script>
</body>
</html>`;
}
