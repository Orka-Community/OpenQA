import { getSidebarHTML } from './components/sidebar.js';
import { getBaseStyles, getFontsLink } from './components/styles.js';

// Config HTML template
export function getConfigHTML(cfg: any): string {
  const sidebar = getSidebarHTML({ activePage: 'config' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Configuration</title>
  ${getFontsLink()}
  <style>
    ${getBaseStyles()}

    /* Page-specific styles */
    .btn-sm {
      font-family: var(--sans);
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-sm.btn-ghost { background: var(--panel); color: var(--text-2); border: 1px solid var(--border); }
    .btn-sm.btn-ghost:hover { border-color: var(--border-hi); color: var(--text-1); }
    .btn-sm.btn-primary { background: var(--accent); color: #fff; }
    .btn-sm.btn-primary:hover { background: #ea580c; box-shadow: 0 0 20px rgba(249,115,22,0.35); }

    .panel { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); }
    .panel-title { font-size: 13px; font-weight: 700; letter-spacing: -0.1px; }
    .panel-body { padding: 24px; }

    .form-grid { display: grid; gap: 20px; }
    .form-section { display: flex; flex-direction: column; gap: 16px; }
    .form-section-title { font-size: 12px; font-weight: 700; color: var(--text-2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field.full { grid-column: 1 / -1; }

    label { font-family: var(--mono); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }

    input, select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-1);
      padding: 10px 14px;
      border-radius: var(--radius);
      font-family: var(--mono);
      font-size: 12px;
      transition: all 0.15s ease;
    }
    input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

    input[type="checkbox"] { width: 16px; height: 16px; margin: 0; cursor: pointer; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-2); text-transform: none; letter-spacing: normal; }

    .actions { display: flex; gap: 12px; padding: 20px 24px; background: var(--surface); border-top: 1px solid var(--border); }

    .message { font-family: var(--mono); font-size: 11px; padding: 8px 12px; border-radius: var(--radius); margin-left: auto; }
    .message.success { background: var(--green-lo); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
    .message.error { background: var(--red-lo); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }

    .code-block { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; font-family: var(--mono); font-size: 11px; color: var(--text-2); overflow-x: auto; }
    .code-block pre { margin: 0; line-height: 1.6; }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      aside { display: none; }
      .form-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<div class="shell">
  ${sidebar}

  <main>
    <div class="topbar">
      <div>
        <div class="page-title">Configuration</div>
        <div class="page-breadcrumb">openqa / system / settings</div>
      </div>
      <div class="topbar-actions">
        <button class="btn-sm btn-ghost" onclick="exportConfig()">Export Config</button>
        <button class="btn-sm btn-ghost" onclick="importConfig()">Import Config</button>
        <button class="btn-sm btn-primary" onclick="saveAllConfig()">Save All</button>
      </div>
    </div>

    <div class="content">
      <!-- Target Configuration — URL or GitHub -->
      <div class="panel">
        <div class="panel-head" style="flex-direction:column;align-items:flex-start;gap:12px;padding-bottom:0;border-bottom:none;">
          <span class="panel-title">🎯 Target Configuration</span>

          <!-- Mode toggle -->
          <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;width:100%;margin-top:4px;">
            <button id="tab-url" onclick="switchTargetMode('url')"
              style="flex:1;padding:9px 0;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:background 0.15s,color 0.15s;border-right:1px solid var(--border);background:var(--accent);color:#fff;">
              🌐 Target URL
            </button>
            <button id="tab-github" onclick="switchTargetMode('github')"
              style="flex:1;padding:9px 0;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:background 0.15s,color 0.15s;border-right:1px solid var(--border);background:transparent;color:var(--text-2);">
              🐙 GitHub
            </button>
            <button id="tab-gitlab" onclick="switchTargetMode('gitlab')"
              style="flex:1;padding:9px 0;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:background 0.15s,color 0.15s;background:transparent;color:var(--text-2);">
              🦊 GitLab
            </button>
          </div>
        </div>

        <div class="panel-body">
          <!-- ── URL mode ─────────────────────────────────────────────── -->
          <form class="form-grid" id="saas-form" data-mode="url">
            <div id="section-url">
              <div class="form-section-title">SaaS Application</div>
              <div class="form-field full">
                <label>Application URL</label>
                <input type="url" id="saas_url" name="saas.url" value="${cfg.saas?.url || ''}" placeholder="https://your-app.com">
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>Authentication Type</label>
                  <select id="saas_authType" name="saas.authType">
                    <option value="none" ${cfg.saas?.authType === 'none' ? 'selected' : ''}>None</option>
                    <option value="basic" ${cfg.saas?.authType === 'basic' ? 'selected' : ''}>Basic Auth</option>
                    <option value="bearer" ${cfg.saas?.authType === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                    <option value="session" ${cfg.saas?.authType === 'session' ? 'selected' : ''}>Session</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Timeout (seconds)</label>
                  <input type="number" id="saas_timeout" name="saas.timeout" value="30" min="5" max="300">
                </div>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>Username</label>
                  <input type="text" id="saas_username" name="saas.username" value="${cfg.saas?.username || ''}" placeholder="username">
                </div>
                <div class="form-field">
                  <label>Password</label>
                  <input type="password" id="saas_password" name="saas.password" value="${cfg.saas?.password || ''}" placeholder="password">
                </div>
              </div>
            </div>

            <!-- ── GitHub mode ────────────────────────────────────────── -->
            <div id="section-github" style="display:none;">
              <div class="form-section-title">GitHub Repository</div>
              <div class="form-row">
                <div class="form-field">
                  <label>Owner / Organisation</label>
                  <input type="text" id="github_owner" name="github.owner" value="${cfg.github?.owner || ''}" placeholder="Orka-Community">
                </div>
                <div class="form-field">
                  <label>Repository</label>
                  <input type="text" id="github_repo" name="github.repo" value="${cfg.github?.repo || ''}" placeholder="paper2any">
                </div>
              </div>
              <div class="form-field full">
                <label>Personal Access Token</label>
                <input type="password" id="github_token" name="github.token" value="${cfg.github?.token || ''}" placeholder="ghp_xxxxxxxxxxxx">
                <p style="font-size:12px;color:var(--text-2);margin-top:6px;">
                  Scope requis : <code>repo</code> (read + create issues). Repos publics fonctionnent sans token (60 req/hr).
                </p>
              </div>
              <p style="font-size:12px;color:var(--text-2);margin-top:8px;">
                OpenQA testera le dépôt
                <code style="color:var(--accent)" id="github-url-preview">https://github.com/…</code>.
              </p>
            </div>

            <!-- ── GitLab mode ────────────────────────────────────────── -->
            <div id="section-gitlab" style="display:none;">
              <div class="form-section-title">GitLab Repository</div>
              <div class="form-field full">
                <label>Instance URL <span style="font-weight:400;color:var(--text-2)">(laisser vide pour gitlab.com)</span></label>
                <input type="url" id="gitlab_url" name="gitlab.url" placeholder="https://gitlab.com">
              </div>
              <div class="form-field full">
                <label>Project path</label>
                <input type="text" id="gitlab_project" name="gitlab.project" placeholder="myorg/myrepo">
              </div>
              <div class="form-field full">
                <label>Personal Access Token</label>
                <input type="password" id="gitlab_token" name="gitlab.token" placeholder="glpat-xxxxxxxxxxxx">
                <p style="font-size:12px;color:var(--text-2);margin-top:6px;">
                  Scope requis : <code>read_api</code> (lecture des fichiers). Ajouter <code>api</code> pour créer des issues.
                </p>
              </div>
              <p style="font-size:12px;color:var(--text-2);margin-top:8px;">
                OpenQA testera le dépôt
                <code style="color:var(--accent)" id="gitlab-url-preview">https://gitlab.com/…</code>.
              </p>
            </div>
          </form>
        </div>
      </div>

      <!-- LLM — redirect to env page -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">🤖 LLM Configuration</span>
          <a href="/config/env" style="font-size:12px;color:var(--accent);text-decoration:none;">Open in Environment Manager →</a>
        </div>
        <div class="panel-body">
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;color:var(--text-2);font-size:13px;">
            <span style="font-size:22px;">⚙️</span>
            <div>
              LLM provider, API key, and model are managed in the <strong style="color:var(--text-1)">Environment Manager</strong>
              (<code style="color:var(--accent)">/config/env</code>) to keep secrets in one place.
              <br>Current provider: <strong style="color:var(--text-1)">${cfg.llm?.provider || 'openai'}</strong>
              · Model: <strong style="color:var(--text-1)">${cfg.llm?.model || 'default'}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent Configuration -->
      <div class="panel">
        <div class="panel-head"><span class="panel-title">🎯 Agent Settings</span></div>
        <div class="panel-body">
          <form class="form-grid" id="agent-form">
            <div class="form-section">
              <div class="form-section-title">Agent Behavior</div>
              <div class="form-field">
                <label class="checkbox-label">
                  <input type="checkbox" id="agent_autoStart" name="agent.autoStart" ${cfg.agent?.autoStart ? 'checked' : ''}>
                  Auto-start on launch
                </label>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>Check Interval (ms)</label>
                  <input type="number" id="agent_intervalMs" name="agent.intervalMs" value="${cfg.agent?.intervalMs || 3600000}" min="60000" step="60000">
                </div>
                <div class="form-field">
                  <label>Max Iterations</label>
                  <input type="number" id="agent_maxIterations" name="agent.maxIterations" value="${cfg.agent?.maxIterations || 10}" min="1" max="100">
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="actions">
        <button class="btn-sm btn-ghost" id="btn-test-conn" onclick="testConnection()">Test Connection</button>
        <button class="btn-sm btn-ghost" onclick="resetConfig()">Reset to Defaults</button>
        <div id="message"></div>
      </div>
    </div>
  </main>
</div>

<script>
  // ── Target mode (url | github | gitlab) ──────────────────────────────────────
  let _targetMode = localStorage.getItem('openqa_target_mode') || 'url';

  function switchTargetMode(mode) {
    _targetMode = mode;
    localStorage.setItem('openqa_target_mode', mode);

    const sections = { url: 'section-url', github: 'section-github', gitlab: 'section-gitlab' };
    const tabs     = { url: 'tab-url',     github: 'tab-github',     gitlab: 'tab-gitlab'     };

    for (const [m, id] of Object.entries(sections)) {
      const el = document.getElementById(id);
      if (el) el.style.display = (m === mode) ? '' : 'none';
    }
    for (const [m, id] of Object.entries(tabs)) {
      const el = document.getElementById(id);
      if (el) {
        el.style.background = (m === mode) ? 'var(--accent)' : 'transparent';
        el.style.color      = (m === mode) ? '#fff'          : 'var(--text-2)';
      }
    }
    updateGithubPreview();
    updateGitlabPreview();
  }

  function updateGithubPreview() {
    const owner   = (document.getElementById('github_owner')?.value || '').trim();
    const repo    = (document.getElementById('github_repo')?.value  || '').trim();
    const preview = document.getElementById('github-url-preview');
    if (preview) {
      preview.textContent = (owner && repo)
        ? 'https://github.com/' + owner + '/' + repo
        : 'https://github.com/…';
    }
  }

  function updateGitlabPreview() {
    const base    = ((document.getElementById('gitlab_url')?.value     || '').trim() || 'https://gitlab.com');
    const project = (document.getElementById('gitlab_project')?.value  || '').trim();
    const preview = document.getElementById('gitlab-url-preview');
    if (preview) {
      preview.textContent = project ? base + '/' + project : base + '/…';
    }
  }

  // Wire live previews to inputs after DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('github_owner')?.addEventListener('input', updateGithubPreview);
    document.getElementById('github_repo')?.addEventListener('input',  updateGithubPreview);
    document.getElementById('gitlab_url')?.addEventListener('input',     updateGitlabPreview);
    document.getElementById('gitlab_project')?.addEventListener('input', updateGitlabPreview);
  });

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function saveAllConfig() {
    const forms = ['saas-form', 'agent-form'];
    const config = {};

    for (const formId of forms) {
      const form = document.getElementById(formId);
      const formData = new FormData(form);

      for (let [key, value] of formData.entries()) {
        if (value === '') continue;
        const keys = key.split('.');
        let obj = config;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        if (key.includes('autoStart')) {
          obj[keys[keys.length - 1]] = value === 'on';
        } else if (key.includes('intervalMs') || key.includes('maxIterations') || key.includes('timeout')) {
          obj[keys[keys.length - 1]] = parseInt(value);
        } else {
          obj[keys[keys.length - 1]] = value;
        }
      }
    }

    // In GitHub mode: clear saas.url + gitlab
    if (_targetMode === 'github') {
      if (!config.saas) config.saas = {};
      config.saas.url = '';
      config.gitlab = { token: '', project: '', url: '' };
    }
    // In GitLab mode: clear saas.url + github
    if (_targetMode === 'gitlab') {
      if (!config.saas) config.saas = {};
      config.saas.url = '';
      if (!config.github) config.github = {};
      config.github.owner = '';
      config.github.repo  = '';
    }
    // In URL mode: clear github + gitlab
    if (_targetMode === 'url') {
      if (!config.github) config.github = {};
      config.github.owner = '';
      config.github.repo  = '';
      config.gitlab = { token: '', project: '', url: '' };
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      showMessage(response.ok ? 'Configuration saved!' : 'Failed to save', response.ok ? 'success' : 'error');
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    }
  }

  // ── Test connection ───────────────────────────────────────────────────────────
  async function testConnection() {
    const btn = document.getElementById('btn-test-conn');
    btn.textContent = 'Testing…';
    btn.disabled = true;

    try {
      let r;
      if (_targetMode === 'github') {
        showMessage('Testing GitHub repo…', 'success');
        const res = await fetch('/api/test-github', { method: 'POST', credentials: 'include' });
        r = await res.json();
      } else if (_targetMode === 'gitlab') {
        showMessage('Testing GitLab repo…', 'success');
        const res = await fetch('/api/test-gitlab', { method: 'POST', credentials: 'include' });
        r = await res.json();
      } else {
        const url      = document.getElementById('saas_url').value.trim();
        const authType = document.getElementById('saas_authType').value;
        const username = document.getElementById('saas_username').value.trim();
        const password = document.getElementById('saas_password').value;

        if (!url) {
          showMessage('Enter an Application URL first', 'error');
          return;
        }
        showMessage('Testing connection…', 'success');
        const res = await fetch('/api/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ url, authType, username, password })
        });
        r = await res.json();
      }

      const latencyStr = r.latency != null ? \` · \${r.latency}ms\` : '';
      const authStr    = r.authenticated ? ' (authenticated)' : '';

      if (r.success) {
        showMessage(\`✓ \${r.message}\${authStr}\${latencyStr}\`, 'success');
      } else {
        const hints = {
          timeout:       'Check your network or firewall.',
          network_error: 'URL is unreachable — check spelling or DNS.',
          auth_failed:   'Credentials are wrong or auth is required.',
          forbidden:     'Server is reachable — check IP restrictions.',
          not_found:     'URL path not found — check the base URL.',
          server_error:  'Server-side error — the app may be down.',
        };
        const hint = (_targetMode === 'url' && hints[r.category]) ? \` — \${hints[r.category]}\` : '';
        showMessage(\`✗ \${r.message}\${hint}\${latencyStr}\`, 'error');
      }
    } catch (error) {
      showMessage('Request failed: ' + error.message, 'error');
    } finally {
      btn.textContent = 'Test Connection';
      btn.disabled = false;
    }
  }

  async function exportConfig() {
    const response = await fetch('/api/config', { credentials: 'include' });
    const config = await response.json();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'openqa-config.json';
    a.click();
  }

  function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      try {
        const config = JSON.parse(text);
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(config)
        });
        location.reload();
      } catch (err) {
        showMessage('Invalid config file', 'error');
      }
    };
    input.click();
  }

  async function resetConfig() {
    if (confirm('Reset all configuration to defaults?')) {
      await fetch('/api/config/reset', { method: 'POST', credentials: 'include' });
      location.reload();
    }
  }
  
  function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = 'message ' + type;
    setTimeout(() => { el.textContent = ''; el.className = ''; }, 5000);
  }

  // ── Load fresh config from API on page load ──────────────────────────────────
  // This overrides SSR values and ensures the form always shows the latest DB state.
  function setVal(id, value) {
    const el = document.getElementById(id);
    if (!el || value == null || value === '') return;
    if (el.tagName === 'SELECT') {
      el.value = value;
    } else if (el.type === 'checkbox') {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch('/api/config', { credentials: 'include' });
      if (!res.ok) return;
      const cfg = await res.json();

      // SaaS
      setVal('saas_url', cfg.saas?.url);
      setVal('saas_authType', cfg.saas?.authType);
      setVal('saas_username', cfg.saas?.username);
      if (cfg.saas?.password) setVal('saas_password', cfg.saas.password);

      // GitHub
      setVal('github_owner', cfg.github?.owner);
      setVal('github_repo',  cfg.github?.repo);
      if (cfg.github?.token) setVal('github_token', cfg.github.token);

      // GitLab (stored via config.set as flat keys)
      if (cfg.gitlab?.token)   setVal('gitlab_token',   cfg.gitlab.token);
      if (cfg.gitlab?.project) setVal('gitlab_project', cfg.gitlab.project);
      if (cfg.gitlab?.url)     setVal('gitlab_url',     cfg.gitlab.url);

      // Agent
      setVal('agent_autoStart', cfg.agent?.autoStart);
      if (cfg.agent?.intervalMs)    setVal('agent_intervalMs', cfg.agent.intervalMs);
      if (cfg.agent?.maxIterations) setVal('agent_maxIterations', cfg.agent.maxIterations);

      // Detect mode — prefer saved choice, fallback to data-driven detection
      const hasGithub = !!(cfg.github?.owner || cfg.github?.repo);
      const hasGitlab = !!(cfg.gitlab?.project);
      const hasUrl    = !!(cfg.saas?.url);
      const savedMode = localStorage.getItem('openqa_target_mode');
      const mode = savedMode || (hasGithub && !hasUrl ? 'github' : hasGitlab && !hasUrl ? 'gitlab' : 'url');
      switchTargetMode(mode);
    } catch (e) {
      console.error('Failed to reload config from API:', e);
    }
  }

  // Load on page open so the form always reflects the latest DB state
  loadConfig();
</script>

</body>
</html>`;
}
