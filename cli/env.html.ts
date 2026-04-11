/**
 * Environment Variables Management Page — Design system aligned with dashboard
 */

export function getEnvHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Environment</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #080b10;
      --surface: #0d1117;
      --panel: #111720;
      --border: rgba(255,255,255,0.06);
      --border-hi: rgba(255,255,255,0.12);
      --accent: #f97316;
      --accent-lo: rgba(249,115,22,0.08);
      --accent-md: rgba(249,115,22,0.18);
      --green: #22c55e;
      --green-lo: rgba(34,197,94,0.08);
      --red: #ef4444;
      --red-lo: rgba(239,68,68,0.08);
      --amber: #f59e0b;
      --amber-lo: rgba(245,158,11,0.08);
      --blue: #38bdf8;
      --blue-lo: rgba(56,189,248,0.08);
      --text-1: #f1f5f9;
      --text-2: #8b98a8;
      --text-3: #4b5563;
      --mono: 'DM Mono', monospace;
      --sans: 'Syne', sans-serif;
      --radius: 10px;
      --radius-lg: 16px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text-1);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── Layout ── */
    .shell {
      display: grid;
      grid-template-columns: 220px 1fr;
      min-height: 100vh;
    }

    /* ── Sidebar ── */
    aside {
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 28px 0;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 24px 32px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .logo-mark {
      width: 34px; height: 34px;
      background: var(--accent);
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-size: 17px;
      font-weight: 800;
      color: #fff;
    }

    .logo-name { font-weight: 800; font-size: 18px; letter-spacing: -0.5px; }
    .logo-version { font-family: var(--mono); font-size: 10px; color: var(--text-3); }

    .nav-section { padding: 8px 12px; flex: 1; overflow-y: auto; }

    .nav-label {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 0 12px;
      margin: 16px 0 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius);
      color: var(--text-2);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .nav-item:hover { color: var(--text-1); background: var(--panel); }
    .nav-item.active { color: var(--accent); background: var(--accent-lo); }
    .nav-item .icon { font-size: 15px; width: 20px; text-align: center; }

    .sidebar-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
    }

    /* ── Main ── */
    main { display: flex; flex-direction: column; min-height: 100vh; overflow-y: auto; }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 32px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .page-title { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; }
    .page-sub { font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-top: 2px; }

    .topbar-actions { display: flex; align-items: center; gap: 10px; }

    .btn {
      font-family: var(--sans);
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .btn-ghost {
      background: var(--panel);
      color: var(--text-2);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { border-color: var(--border-hi); color: var(--text-1); }

    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) { background: #ea580c; box-shadow: 0 0 20px rgba(249,115,22,0.35); }

    /* ── Content ── */
    .content { padding: 28px 32px; display: flex; flex-direction: column; gap: 24px; }

    /* ── Tabs (category selector) ── */
    .tab-bar {
      display: flex;
      gap: 4px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 4px;
      flex-wrap: wrap;
    }

    .tab-btn {
      padding: 7px 14px;
      background: transparent;
      border: none;
      border-radius: 7px;
      color: var(--text-3);
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .tab-btn:hover { color: var(--text-2); }
    .tab-btn.active {
      background: var(--panel);
      color: var(--text-1);
      border: 1px solid var(--border-hi);
    }
    .tab-btn .tab-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--text-3);
    }
    .tab-btn.has-required .tab-dot { background: var(--amber); }
    .tab-btn.active .tab-dot { background: var(--accent); }

    /* ── Section ── */
    .section { display: none; flex-direction: column; gap: 16px; }
    .section.active { display: flex; }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .section-icon {
      width: 36px; height: 36px;
      background: var(--accent-lo);
      border: 1px solid var(--accent-md);
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-size: 16px;
    }
    .section-title { font-size: 15px; font-weight: 700; }
    .section-desc { font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-top: 2px; }

    /* ── Env card ── */
    .env-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      transition: border-color 0.15s;
    }
    .env-card:hover { border-color: var(--border-hi); }
    .env-card.has-value { border-color: rgba(249,115,22,0.15); }

    .env-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .env-key {
      font-family: var(--mono);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-1);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-required {
      font-family: var(--sans);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: rgba(239,68,68,0.15);
      color: var(--red);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 4px;
      padding: 2px 6px;
    }
    .badge-sensitive {
      font-size: 9px;
      font-weight: 700;
      font-family: var(--sans);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--amber-lo);
      color: var(--amber);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 4px;
      padding: 2px 6px;
    }

    .env-desc {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
      margin-bottom: 14px;
      line-height: 1.5;
    }

    .env-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .env-input, .env-select {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      padding: 10px 14px;
      font-family: var(--mono);
      font-size: 13px;
      color: var(--text-1);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
    }
    .env-input:focus, .env-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
    }
    .env-input.changed { border-color: rgba(249,115,22,0.5); }
    .env-input.invalid { border-color: var(--red); }

    .env-select option { background: var(--panel); }

    .env-action-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1px solid var(--border-hi);
      background: var(--surface);
      color: var(--text-2);
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 14px;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .env-action-btn:hover { background: var(--panel); color: var(--text-1); border-color: var(--border-hi); }
    .env-action-btn.test-btn:hover { background: var(--blue-lo); color: var(--blue); border-color: rgba(56,189,248,0.25); }
    .env-action-btn.gen-btn:hover { background: var(--green-lo); color: var(--green); border-color: rgba(34,197,94,0.25); }

    .env-feedback {
      font-family: var(--mono);
      font-size: 11px;
      margin-top: 8px;
      min-height: 16px;
    }
    .env-feedback.error { color: var(--red); }
    .env-feedback.success { color: var(--green); }

    /* ── Toast ── */
    .toast-zone {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 100;
    }

    .toast {
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.2s ease;
      max-width: 380px;
    }
    .toast.success { background: var(--panel); border: 1px solid rgba(34,197,94,0.3); color: var(--green); }
    .toast.error { background: var(--panel); border: 1px solid rgba(239,68,68,0.3); color: var(--red); }
    .toast.warning { background: var(--panel); border: 1px solid rgba(245,158,11,0.3); color: var(--amber); }
    .toast.info { background: var(--panel); border: 1px solid rgba(56,189,248,0.3); color: var(--blue); }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Modal (test result) ── */
    .modal-backdrop {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    .modal-backdrop.open { display: flex; }

    .modal {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: var(--radius-lg);
      padding: 28px;
      width: 420px;
      max-width: 90vw;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }
    .modal-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
    .modal-body { margin-bottom: 20px; }
    .modal-result {
      padding: 14px;
      border-radius: 8px;
      font-family: var(--mono);
      font-size: 12px;
    }
    .modal-result.ok { background: var(--green-lo); border: 1px solid rgba(34,197,94,0.2); color: var(--green); }
    .modal-result.fail { background: var(--red-lo); border: 1px solid rgba(239,68,68,0.2); color: var(--red); }
    .modal-footer { display: flex; justify-content: flex-end; }

    /* ── Spinner ── */
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .loading-state {
      text-align: center;
      padding: 60px 0;
      color: var(--text-3);
      font-family: var(--mono);
      font-size: 12px;
    }

    /* ── Restart banner ── */
    .restart-banner {
      display: none;
      background: var(--amber-lo);
      border: 1px solid rgba(245,158,11,0.25);
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 13px;
      color: var(--amber);
      font-weight: 600;
      align-items: center;
      gap: 10px;
    }
    .restart-banner.show { display: flex; }
  </style>
</head>
<body>
<div class="shell">

  <!-- Sidebar -->
  <aside>
    <div class="logo">
      <div class="logo-mark">Q</div>
      <div>
        <div class="logo-name">OpenQA</div>
        <div class="logo-version">v1.3.4</div>
      </div>
    </div>

    <div class="nav-section">
      <div class="nav-label">Overview</div>
      <a class="nav-item" href="/">
        <span class="icon">📊</span> Dashboard
      </a>
      <a class="nav-item" href="/sessions">
        <span class="icon">🧪</span> Sessions
      </a>
      <a class="nav-item" href="/issues">
        <span class="icon">🐛</span> Issues
      </a>

      <div class="nav-label">Testing</div>
      <a class="nav-item" href="/tests">
        <span class="icon">⚡</span> Tests
      </a>
      <a class="nav-item" href="/coverage">
        <span class="icon">📈</span> Coverage
      </a>
      <a class="nav-item" href="/kanban">
        <span class="icon">📋</span> Kanban
      </a>

      <div class="nav-label">System</div>
      <a class="nav-item" href="/config">
        <span class="icon">⚙️</span> Config
      </a>
      <a class="nav-item active" href="/config/env">
        <span class="icon">🔧</span> Environment
      </a>
      <a class="nav-item" href="/logs">
        <span class="icon">📜</span> Logs
      </a>
    </div>

    <div class="sidebar-footer">
      <div style="font-family:var(--mono);font-size:11px;color:var(--text-3);">
        Environment Variables
      </div>
    </div>
  </aside>

  <!-- Main -->
  <main>
    <div class="topbar">
      <div>
        <div class="page-title">Environment Variables</div>
        <div class="page-sub">Configure runtime variables for OpenQA</div>
      </div>
      <div class="topbar-actions">
        <a class="btn btn-ghost" href="/config">← Back to Config</a>
        <button id="saveBtn" class="btn btn-primary" disabled>
          💾 Save Changes
        </button>
      </div>
    </div>

    <div class="content">

      <!-- Restart banner -->
      <div class="restart-banner" id="restartBanner">
        ⚠️ Some changes require a server restart to take effect.
      </div>

      <!-- Loading -->
      <div class="loading-state" id="loadingState">
        <div class="spinner"></div>
        Loading environment variables…
      </div>

      <!-- Main content (hidden while loading) -->
      <div id="mainContent" style="display:none;flex-direction:column;gap:24px;">

        <!-- Tab bar -->
        <div class="tab-bar" id="tabBar"></div>

        <!-- Sections -->
        <div id="sections"></div>

      </div>
    </div>
  </main>
</div>

<!-- Test result modal -->
<div class="modal-backdrop" id="testModal">
  <div class="modal">
    <div class="modal-title">Connection Test</div>
    <div class="modal-body">
      <div class="modal-result" id="testResultBox">…</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  </div>
</div>

<!-- Toast zone -->
<div class="toast-zone" id="toastZone"></div>

<script>
/* ── State ── */
let envVars = [];
let changed = {};
let hasRequiredMissing = false;

const TABS = [
  { id: 'llm',           label: '🤖 LLM',          desc: 'Language model provider & API keys' },
  { id: 'security',      label: '🔒 Security',      desc: 'Authentication & JWT configuration' },
  { id: 'target',        label: '🎯 Target App',    desc: 'Application under test settings' },
  { id: 'github',        label: '🐙 GitHub',        desc: 'Repository & CI/CD integration' },
  { id: 'web',           label: '🌐 Web Server',    desc: 'HTTP host, port & CORS settings' },
  { id: 'agent',         label: '🤖 Agent',         desc: 'Autonomous agent behaviour' },
  { id: 'database',      label: '💾 Database',      desc: 'Persistence & storage' },
  { id: 'notifications', label: '🔔 Notifications', desc: 'Slack & Discord webhooks' },
];

/* ── Init ── */
async function init() {
  try {
    const res = await fetch('/api/env');
    if (!res.ok) { toast('error', 'Failed to load environment variables (status ' + res.status + ')'); return; }
    const data = await res.json();
    envVars = data.variables || [];
    renderAll();
    document.getElementById('loadingState').style.display = 'none';
    const mc = document.getElementById('mainContent');
    mc.style.display = 'flex';
  } catch (e) {
    toast('error', 'Network error — ' + e.message);
  }
}

/* ── Render ── */
function renderAll() {
  renderTabBar();
  renderSections();
  activateTab(TABS[0].id);
}

function renderTabBar() {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = TABS.map(t => {
    const vars = envVars.filter(v => v.category === t.id);
    const hasRequired = vars.some(v => v.required);
    return \`<button class="tab-btn\${hasRequired ? ' has-required' : ''}" data-tab="\${t.id}" onclick="activateTab('\${t.id}')">
      <span class="tab-dot"></span>
      \${t.label}
    </button>\`;
  }).join('');
}

function renderSections() {
  const container = document.getElementById('sections');
  container.innerHTML = TABS.map(t => {
    const vars = envVars.filter(v => v.category === t.id);
    return \`<div class="section" id="section-\${t.id}">
      <div class="section-header">
        <div class="section-icon">\${t.label.split(' ')[0]}</div>
        <div>
          <div class="section-title">\${t.label.slice(t.label.indexOf(' ')+1)}</div>
          <div class="section-desc">\${t.desc}</div>
        </div>
      </div>
      \${vars.map(renderCard).join('')}
      \${vars.length === 0 ? '<div style="color:var(--text-3);font-family:var(--mono);font-size:12px;padding:20px 0">No variables in this category.</div>' : ''}
    </div>\`;
  }).join('');
}

function renderCard(v) {
  const displayVal = v.displayValue || '';
  const isSensitive = v.sensitive;
  const inputType = (v.type === 'password' && !changed[v.key]) ? 'password' : 'text';

  let inputHTML = '';
  if (v.type === 'select' || v.type === 'boolean') {
    const opts = v.type === 'boolean'
      ? [{ val: 'true', lbl: 'true' }, { val: 'false', lbl: 'false' }]
      : (v.options || []).map(o => ({ val: o, lbl: o }));
    inputHTML = \`<select class="env-select" data-key="\${v.key}" onchange="handleChange(this)">
      <option value="">— Select —</option>
      \${opts.map(o => \`<option value="\${o.val}" \${displayVal === o.val ? 'selected' : ''}>\${o.lbl}</option>\`).join('')}
    </select>\`;
  } else {
    inputHTML = \`<input
      type="\${inputType}"
      class="env-input"
      data-key="\${v.key}"
      value="\${escHtml(displayVal)}"
      placeholder="\${escHtml(v.placeholder || '')}"
      oninput="handleChange(this)"
      autocomplete="off"
    />\`;
  }

  const testBtn = v.testable
    ? \`<button class="env-action-btn test-btn" onclick="testVar('\${v.key}')" title="Test connection">🧪</button>\`
    : '';

  const genBtn = v.key === 'OPENQA_JWT_SECRET'
    ? \`<button class="env-action-btn gen-btn" onclick="generateSecret('\${v.key}')" title="Generate secret">🔑</button>\`
    : '';

  const toggleBtn = (v.type === 'password' || isSensitive)
    ? \`<button class="env-action-btn" onclick="toggleVis('\${v.key}')" title="Toggle visibility" id="vis-\${v.key}">👁</button>\`
    : '';

  return \`<div class="env-card\${displayVal ? ' has-value' : ''}" id="card-\${v.key}">
    <div class="env-card-head">
      <div class="env-key">
        \${v.key}
        \${v.required ? '<span class="badge-required">Required</span>' : ''}
        \${isSensitive ? '<span class="badge-sensitive">Sensitive</span>' : ''}
      </div>
    </div>
    <div class="env-desc">\${v.description}</div>
    <div class="env-input-row">
      \${inputHTML}
      \${toggleBtn}
      \${testBtn}
      \${genBtn}
    </div>
    <div class="env-feedback" id="fb-\${v.key}"></div>
  </div>\`;
}

/* ── Tab switching ── */
function activateTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'section-' + id));
}

/* ── Input handling ── */
function handleChange(el) {
  const key = el.dataset.key;
  const val = el.value;
  changed[key] = val;
  el.classList.add('changed');
  el.classList.remove('invalid');
  clearFeedback(key);
  document.getElementById('saveBtn').disabled = false;
}

/* ── Toggle password visibility ── */
function toggleVis(key) {
  const inp = document.querySelector('[data-key="' + key + '"]');
  if (!inp || inp.tagName !== 'INPUT') return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

/* ── Save ── */
async function saveChanges() {
  if (!Object.keys(changed).length) return;

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';

  try {
    const res = await fetch('/api/env/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables: changed }),
      credentials: 'include',
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errStr = body.errors
        ? Object.entries(body.errors).map(([k, v]) => k + ': ' + v).join('; ')
        : body.error || 'Failed to save';
      // Show per-field errors
      if (body.errors) {
        for (const [k, msg] of Object.entries(body.errors)) {
          setFeedback(k, 'error', msg);
          const inp = document.querySelector('[data-key="' + k + '"]');
          if (inp) inp.classList.add('invalid');
        }
      }
      toast('error', errStr);
      btn.disabled = false;
      btn.innerHTML = '💾 Save Changes';
      return;
    }

    toast('success', '✅ Saved ' + body.updated + ' variable(s)');
    if (body.restartRequired) {
      document.getElementById('restartBanner').classList.add('show');
    }

    changed = {};
    btn.innerHTML = '💾 Save Changes';
    // Reload to reflect masked values
    setTimeout(() => location.reload(), 1200);
  } catch (e) {
    toast('error', 'Network error — ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '💾 Save Changes';
  }
}

/* ── Test variable ── */
async function testVar(key) {
  const inp = document.querySelector('[data-key="' + key + '"]');
  const val = inp ? inp.value : '';
  if (!val) { toast('warning', 'Enter a value first'); return; }

  setFeedback(key, '', '');
  const btn = document.querySelector('[onclick="testVar(\\''+key+'\\')"]');
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  try {
    const res = await fetch('/api/env/test/' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: val }),
      credentials: 'include',
    });
    const result = await res.json();
    openModal(result.success, result.message);
    setFeedback(key, result.success ? 'success' : 'error', result.success ? '✓ Connected' : '✗ ' + result.message);
  } catch (e) {
    openModal(false, 'Network error: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '🧪'; btn.disabled = false; }
  }
}

/* ── Generate secret ── */
async function generateSecret(key) {
  try {
    const res = await fetch('/api/env/generate/' + key, {
      method: 'POST', credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to generate');
    const { value } = await res.json();
    const inp = document.querySelector('[data-key="' + key + '"]');
    if (inp) {
      inp.type = 'text';
      inp.value = value;
      handleChange(inp);
    }
    setFeedback(key, 'success', '✓ Secret generated — save to persist');
  } catch (e) {
    setFeedback(key, 'error', e.message);
  }
}

/* ── Modal ── */
function openModal(ok, msg) {
  const box = document.getElementById('testResultBox');
  box.className = 'modal-result ' + (ok ? 'ok' : 'fail');
  box.textContent = (ok ? '✓ ' : '✗ ') + msg;
  document.getElementById('testModal').classList.add('open');
}
function closeModal() {
  document.getElementById('testModal').classList.remove('open');
}

/* ── Toast ── */
function toast(type, msg) {
  const zone = document.getElementById('toastZone');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

/* ── Feedback ── */
function setFeedback(key, type, msg) {
  const el = document.getElementById('fb-' + key);
  if (!el) return;
  el.className = 'env-feedback' + (type ? ' ' + type : '');
  el.textContent = msg;
}
function clearFeedback(key) { setFeedback(key, '', ''); }

/* ── Helpers ── */
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* ── Wire save button ── */
document.getElementById('saveBtn').addEventListener('click', saveChanges);

/* ── Close modal on backdrop click ── */
document.getElementById('testModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ── Boot ── */
init();
</script>
</body>
</html>`;
}
