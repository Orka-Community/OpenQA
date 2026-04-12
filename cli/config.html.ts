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
      <!-- SaaS Configuration -->
      <div class="panel">
        <div class="panel-head"><span class="panel-title">🌐 SaaS Target Configuration</span></div>
        <div class="panel-body">
          <form class="form-grid" id="saas-form">
            <div class="form-section">
              <div class="form-section-title">Target Application</div>
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
          </form>
        </div>
      </div>

      <!-- LLM Configuration -->
      <div class="panel">
        <div class="panel-head"><span class="panel-title">🤖 LLM Configuration</span></div>
        <div class="panel-body">
          <form class="form-grid" id="llm-form">
            <div class="form-section">
              <div class="form-section-title">Language Model Provider</div>
              <div class="form-row">
                <div class="form-field">
                  <label>Provider</label>
                  <select id="llm_provider" name="llm.provider">
                    <option value="openai" ${cfg.llm?.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                    <option value="anthropic" ${cfg.llm?.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                    <option value="ollama" ${cfg.llm?.provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Model</label>
                  <input type="text" id="llm_model" name="llm.model" value="${cfg.llm?.model || ''}" placeholder="gpt-4, claude-3-sonnet, etc.">
                </div>
              </div>
              <div class="form-field full">
                <label>API Key</label>
                <input type="password" id="llm_apiKey" name="llm.apiKey" value="${cfg.llm?.apiKey || ''}" placeholder="Your API key">
              </div>
              <div class="form-field full">
                <label>Base URL (for Ollama)</label>
                <input type="url" id="llm_baseUrl" name="llm.baseUrl" value="${cfg.llm?.baseUrl || ''}" placeholder="http://localhost:11434">
              </div>
            </div>
          </form>
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
        <button class="btn-sm btn-ghost" onclick="testConnection()">Test Connection</button>
        <button class="btn-sm btn-ghost" onclick="resetConfig()">Reset to Defaults</button>
        <div id="message"></div>
      </div>
    </div>
  </main>
</div>

<script>
  async function saveAllConfig() {
    const forms = ['saas-form', 'llm-form', 'agent-form'];
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

  async function testConnection() {
    showMessage('Testing connection…', 'success');
    // Read the target URL from the saas.url field if present
    const urlField = document.querySelector('[name="saas.url"]') || document.querySelector('[data-key="saas.url"]');
    const url = urlField ? urlField.value : '';
    if (!url) {
      showMessage('Enter a target URL first', 'error');
      return;
    }
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url })
      });
      const result = await response.json();
      showMessage(
        result.success ? \`Connection successful (HTTP \${result.status})\` : \`Connection failed: \${result.error || 'unreachable'}\`,
        result.success ? 'success' : 'error'
      );
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
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
</script>

</body>
</html>`;
}
