import { ConfigManager } from '../agent/config/index.js';
import express from 'express';
import { WebSocketServer } from 'ws';
import { OpenQADatabase } from '../database/index.js';
import chalk from 'chalk';

export async function startWebServer() {
  const config = new ConfigManager();
  const cfg = config.getConfigSync();
  const db = new OpenQADatabase('./data/openqa.json');

  const app = express();
  app.use(express.json());

  const wss = new WebSocketServer({ noServer: true });

  // API endpoints
  app.get('/api/status', async (req, res) => {
    res.json({ 
      isRunning: true,
      target: cfg.saas.url || 'Not configured'
    });
  });

  app.get('/api/sessions', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await db.getRecentSessions(limit);
    res.json(sessions);
  });

  app.get('/api/sessions/:id/actions', async (req, res) => {
    const actions = await db.getSessionActions(req.params.id);
    res.json(actions);
  });

  app.get('/api/bugs', async (req, res) => {
    const status = req.query.status as any;
    const bugs = status ? await db.getBugsByStatus(status) : await db.getAllBugs();
    res.json(bugs);
  });

  app.get('/api/kanban/tickets', async (req, res) => {
    const column = req.query.column as any;
    const tickets = column ? await db.getKanbanTicketsByColumn(column) : await db.getKanbanTickets();
    res.json(tickets);
  });

  app.patch('/api/kanban/tickets/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    await db.updateKanbanTicket(id, updates);
    res.json({ success: true });
  });

  app.get('/api/config', (req, res) => {
    res.json(cfg);
  });

  app.post('/api/config', async (req, res) => {
    try {
      const configData = req.body;
      
      // Update each configuration key
      for (const [key, value] of Object.entries(configData)) {
        await config.set(key, String(value));
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/config/reset', async (req, res) => {
    try {
      // Reset configuration by clearing all keys
      await db.clearAllConfig();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Human interventions
  app.post('/api/intervention/:id', (req, res) => {
    const { id } = req.params;
    const { response } = req.body;
    
    // Handle intervention response (approve/reject)
    console.log(`Intervention ${id}: ${response}`);
    
    // Broadcast to all WebSocket clients
    broadcast({ 
      type: 'intervention-response', 
      data: { id, response, timestamp: new Date().toISOString() }
    });
    
    res.json({ success: true });
  });

  // Current tasks
  app.get('/api/tasks', async (req, res) => {
    // Mock tasks for now
    const tasks = [
      {
        id: 'task_1',
        name: 'Scan Application',
        status: 'completed',
        agent: 'Main Agent',
        started_at: new Date(Date.now() - 300000).toISOString(),
        completed_at: new Date(Date.now() - 240000).toISOString(),
        result: 'Found 5 testable components'
      },
      {
        id: 'task_2',
        name: 'Generate Tests',
        status: 'in-progress',
        agent: 'Main Agent',
        started_at: new Date(Date.now() - 180000).toISOString(),
        progress: '60%'
      },
      {
        id: 'task_3',
        name: 'Authentication Test',
        status: 'pending',
        agent: 'Auth Specialist',
        dependencies: ['task_2']
      }
    ];
    
    res.json(tasks);
  });

  // Issues encountered
  app.get('/api/issues', async (req, res) => {
    const issues = [
      {
        id: 'issue_1',
        type: 'authentication',
        severity: 'warning',
        message: 'Admin area requires authentication',
        agent: 'Main Agent',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        status: 'pending'
      },
      {
        id: 'issue_2',
        type: 'network',
        severity: 'error',
        message: 'Failed to connect to external API',
        agent: 'API Tester',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        status: 'resolved'
      }
    ];
    
    res.json(issues);
  });

  // Real-time Dashboard
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenQA - Real-time Dashboard</title>
          <style>
            body { font-family: system-ui; max-width: 1400px; margin: 40px auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
            h1 { color: #38bdf8; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
            .status.running { background: #10b981; color: white; }
            .status.idle { background: #f59e0b; color: white; }
            .status.error { background: #ef4444; color: white; }
            .status.paused { background: #64748b; color: white; }
            a { color: #38bdf8; text-decoration: none; }
            a:hover { text-decoration: underline; }
            nav { margin: 20px 0; }
            nav a { margin-right: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .activity-item { 
              background: #334155; 
              padding: 12px; 
              margin: 8px 0; 
              border-radius: 6px; 
              border-left: 3px solid #38bdf8;
              font-size: 14px;
            }
            .activity-item.error { border-left-color: #ef4444; }
            .activity-item.success { border-left-color: #10b981; }
            .activity-item.warning { border-left-color: #f59e0b; }
            .activity-time { color: #64748b; font-size: 12px; }
            .metric { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #38bdf8; }
            .metric-label { color: #94a3b8; font-size: 14px; }
            .intervention-request {
              background: #7c2d12;
              border: 1px solid #dc2626;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
            }
            .intervention-request h4 { color: #fbbf24; margin: 0 0 8px 0; }
            .btn { 
              background: #38bdf8; 
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 14px; 
              margin: 5px;
            }
            .btn:hover { background: #0ea5e9; }
            .btn-success { background: #10b981; }
            .btn-success:hover { background: #059669; }
            .btn-danger { background: #ef4444; }
            .btn-danger:hover { background: #dc2626; }
            .pulse { animation: pulse 2s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .loading { color: #f59e0b; }
          </style>
        </head>
        <body>
          <h1>🤖 OpenQA Real-time Dashboard</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/kanban">Kanban</a>
            <a href="/config">Config</a>
            <span style="color: #64748b;">|</span>
            <span id="connection-status" class="status idle">🔌 Connecting...</span>
          </nav>
          
          <div class="grid-3">
            <div class="card">
              <h2>🤖 Agent Status</h2>
              <div class="metric">
                <span class="metric-label">Status</span>
                <span id="agent-status" class="status idle">Idle</span>
              </div>
              <div class="metric">
                <span class="metric-label">Target</span>
                <span id="target-url">${cfg.saas.url || 'Not configured'}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Active Agents</span>
                <span id="active-agents" class="metric-value">0</span>
              </div>
              <div class="metric">
                <span class="metric-label">Current Session</span>
                <span id="session-id">None</span>
              </div>
            </div>
            
            <div class="card">
              <h2>📊 Session Metrics</h2>
              <div class="metric">
                <span class="metric-label">Total Actions</span>
                <span id="total-actions" class="metric-value">0</span>
              </div>
              <div class="metric">
                <span class="metric-label">Bugs Found</span>
                <span id="bugs-found" class="metric-value">0</span>
              </div>
              <div class="metric">
                <span class="metric-label">Tests Generated</span>
                <span id="tests-generated" class="metric-value">0</span>
              </div>
              <div class="metric">
                <span class="metric-label">Success Rate</span>
                <span id="success-rate" class="metric-value">0%</span>
              </div>
            </div>
            
            <div class="card">
              <h2>⚡ Recent Activity</h2>
              <div id="recent-activities">
                <div class="activity-item">
                  <div>🔄 Waiting for agent activity...</div>
                  <div class="activity-time">System ready</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="grid">
            <div class="card">
              <h2>🤖 Active Agents</h2>
              <div id="active-agents-list">
                <p style="color: #64748b;">No active agents</p>
              </div>
            </div>
            
            <div class="card">
              <h2>🚨 Human Interventions</h2>
              <div id="interventions-list">
                <p style="color: #64748b;">No interventions required</p>
              </div>
            </div>
          </div>
          
          <div class="grid">
            <div class="card">
              <h2>📝 Current Tasks</h2>
              <div id="current-tasks">
                <p style="color: #64748b;">No active tasks</p>
              </div>
            </div>
            
            <div class="card">
              <h2>⚠️ Issues Encountered</h2>
              <div id="issues-list">
                <p style="color: #64748b;">No issues</p>
              </div>
            </div>
          </div>

          <script>
            let ws;
            let activities = [];
            
            function connectWebSocket() {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
              
              ws.onopen = () => {
                document.getElementById('connection-status').textContent = '🟢 Connected';
                document.getElementById('connection-status').className = 'status running';
              };
              
              ws.onclose = () => {
                document.getElementById('connection-status').textContent = '🔴 Disconnected';
                document.getElementById('connection-status').className = 'status error';
                // Reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
              };
              
              ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
              };
            }
            
            function handleWebSocketMessage(data) {
              switch(data.type) {
                case 'status':
                  updateAgentStatus(data.data);
                  break;
                case 'activity':
                  addActivity(data.data);
                  break;
                case 'intervention':
                  addIntervention(data.data);
                  break;
                case 'agents':
                  updateActiveAgents(data.data);
                  break;
                case 'session':
                  updateSessionMetrics(data.data);
                  break;
              }
            }
            
            function updateAgentStatus(status) {
              const statusEl = document.getElementById('agent-status');
              statusEl.textContent = status.isRunning ? 'Running' : 'Idle';
              statusEl.className = \`status \${status.isRunning ? 'running' : 'idle'}\`;
            }
            
            function updateSessionMetrics(session) {
              document.getElementById('total-actions').textContent = session.total_actions || 0;
              document.getElementById('bugs-found').textContent = session.bugs_found || 0;
              document.getElementById('session-id').textContent = session.id || 'None';
              
              const successRate = session.total_actions > 0 
                ? Math.round(((session.total_actions - (session.errors || 0)) / session.total_actions) * 100)
                : 0;
              document.getElementById('success-rate').textContent = successRate + '%';
            }
            
            function addActivity(activity) {
              activities.unshift(activity);
              if (activities.length > 10) activities.pop();
              
              const container = document.getElementById('recent-activities');
              container.innerHTML = activities.map(a => \`
                <div class="activity-item \${a.type}">
                  <div>\${a.message}</div>
                  <div class="activity-time">\${new Date(a.timestamp).toLocaleTimeString()}</div>
                </div>
              \`).join('');
            }
            
            function updateActiveAgents(agents) {
              const countEl = document.getElementById('active-agents');
              const listEl = document.getElementById('active-agents-list');
              
              countEl.textContent = agents.length;
              
              if (agents.length === 0) {
                listEl.innerHTML = '<p style="color: #64748b;">No active agents</p>';
              } else {
                listEl.innerHTML = agents.map(agent => \`
                  <div class="activity-item">
                    <div><strong>\${agent.name}</strong> - \${agent.status}</div>
                    <div class="activity-time">Purpose: \${agent.purpose}</div>
                  </div>
                \`).join('');
              }
            }
            
            function addIntervention(intervention) {
              const container = document.getElementById('interventions-list');
              const interventionEl = document.createElement('div');
              interventionEl.className = 'intervention-request';
              interventionEl.innerHTML = \`
                <h4>🚨 \${intervention.title}</h4>
                <p>\${intervention.description}</p>
                <div>
                  <button class="btn btn-success" onclick="respondToIntervention('\${intervention.id}', 'approve')">✅ Approve</button>
                  <button class="btn btn-danger" onclick="respondToIntervention('\${intervention.id}', 'reject')">❌ Reject</button>
                </div>
              \`;
              container.appendChild(interventionEl);
            }
            
            function respondToIntervention(interventionId, response) {
              fetch('/api/intervention/' + interventionId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response })
              }).then(() => {
                // Remove the intervention from UI
                location.reload();
              });
            }
            
            // Start WebSocket connection
            connectWebSocket();
            
            // Load initial data
            fetch('/api/status').then(r => r.json()).then(updateAgentStatus);
            fetch('/api/sessions?limit=1').then(r => r.json()).then(sessions => {
              if (sessions.length > 0) updateSessionMetrics(sessions[0]);
            });
            
            // Load current tasks
            fetch('/api/tasks').then(r => r.json()).then(updateCurrentTasks);
            
            // Load issues
            fetch('/api/issues').then(r => r.json()).then(updateIssues);
            
            function updateCurrentTasks(tasks) {
              const container = document.getElementById('current-tasks');
              if (tasks.length === 0) {
                container.innerHTML = '<p style="color: #64748b;">No active tasks</p>';
              } else {
                container.innerHTML = tasks.map(task => \`
                  <div class="activity-item">
                    <div><strong>\${task.name}</strong> - \${task.status}</div>
                    <div class="activity-time">Agent: \${task.agent} | \${task.progress || ''}</div>
                    \${task.result ? \`<div style="color: #10b981; margin-top: 4px;">\${task.result}</div>\` : ''}
                  </div>
                \`).join('');
              }
            }
            
            function updateIssues(issues) {
              const container = document.getElementById('issues-list');
              if (!container) return;
              
              if (issues.length === 0) {
                container.innerHTML = '<p style="color: #64748b;">No issues</p>';
              } else {
                container.innerHTML = issues.map(issue => \`
                  <div class="activity-item \${issue.severity}">
                    <div><strong>\${issue.type}</strong> - \${issue.message}</div>
                    <div class="activity-time">Agent: \${issue.agent} | Status: \${issue.status}</div>
                  </div>
                \`).join('');
              }
            }
          </script>
        </body>
      </html>
    `);
  });

  app.get('/kanban', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenQA - Kanban Board</title>
          <style>
            body { font-family: system-ui; max-width: 1400px; margin: 40px auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
            h1 { color: #38bdf8; }
            nav { margin: 20px 0; }
            nav a { color: #38bdf8; text-decoration: none; margin-right: 20px; }
            nav a:hover { text-decoration: underline; }
            .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 30px; }
            .column { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 15px; }
            .column h3 { margin-top: 0; color: #38bdf8; }
            .ticket { background: #334155; padding: 12px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #38bdf8; }
            .ticket h4 { margin: 0 0 8px 0; font-size: 14px; }
            .ticket p { margin: 0; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>📋 Kanban Board</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/kanban">Kanban</a>
            <a href="/config">Config</a>
          </nav>
          <div class="board">
            <div class="column">
              <h3>Backlog</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
            <div class="column">
              <h3>To Do</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
            <div class="column">
              <h3>In Progress</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
            <div class="column">
              <h3>Done</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
          </div>
          <p style="margin-top: 40px; color: #64748b;">Tickets will appear here when the agent starts finding bugs and creating tasks.</p>
        </body>
      </html>
    `);
  });

  app.get('/config', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenQA - Configuration</title>
          <style>
            body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
            h1 { color: #38bdf8; }
            nav { margin: 20px 0; }
            nav a { color: #38bdf8; text-decoration: none; margin-right: 20px; }
            nav a:hover { text-decoration: underline; }
            .section { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .section h2 { margin-top: 0; color: #38bdf8; font-size: 18px; }
            .config-item { margin: 15px 0; }
            .config-item label { display: block; margin-bottom: 5px; color: #94a3b8; font-size: 14px; }
            .config-item input, .config-item select { 
              background: #334155; 
              border: 1px solid #475569; 
              color: #e2e8f0; 
              padding: 8px 12px; 
              border-radius: 4px; 
              font-family: monospace; 
              font-size: 14px; 
              width: 100%;
              max-width: 400px;
            }
            .config-item input:focus, .config-item select:focus { 
              outline: none; 
              border-color: #38bdf8; 
              box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.1); 
            }
            .btn { 
              background: #38bdf8; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 14px; 
              margin-right: 10px;
            }
            .btn:hover { background: #0ea5e9; }
            .btn-secondary { background: #64748b; }
            .btn-secondary:hover { background: #475569; }
            .success { color: #10b981; margin-left: 10px; }
            .error { color: #ef4444; margin-left: 10px; }
            code { background: #334155; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
            .checkbox { margin-right: 8px; }
          </style>
        </head>
        <body>
          <h1>⚙️ Configuration</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/kanban">Kanban</a>
            <a href="/config">Config</a>
          </nav>
          
          <div class="section">
            <h2>SaaS Target</h2>
            <form id="configForm">
              <div class="config-item">
                <label>URL</label>
                <input type="url" id="saas_url" name="saas.url" value="${cfg.saas.url || ''}" placeholder="https://your-app.com">
              </div>
              <div class="config-item">
                <label>Auth Type</label>
                <select id="saas_authType" name="saas.authType">
                  <option value="none" ${cfg.saas.authType === 'none' ? 'selected' : ''}>None</option>
                  <option value="basic" ${cfg.saas.authType === 'basic' ? 'selected' : ''}>Basic Auth</option>
                  <option value="bearer" ${cfg.saas.authType === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                  <option value="session" ${cfg.saas.authType === 'session' ? 'selected' : ''}>Session</option>
                </select>
              </div>
              <div class="config-item">
                <label>Username (for Basic Auth)</label>
                <input type="text" id="saas_username" name="saas.username" value="${cfg.saas.username || ''}" placeholder="username">
              </div>
              <div class="config-item">
                <label>Password (for Basic Auth)</label>
                <input type="password" id="saas_password" name="saas.password" value="${cfg.saas.password || ''}" placeholder="password">
              </div>
            </form>
          </div>

          <div class="section">
            <h2>LLM Configuration</h2>
            <form id="configForm">
              <div class="config-item">
                <label>Provider</label>
                <select id="llm_provider" name="llm.provider">
                  <option value="openai" ${cfg.llm.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                  <option value="anthropic" ${cfg.llm.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                  <option value="ollama" ${cfg.llm.provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                </select>
              </div>
              <div class="config-item">
                <label>Model</label>
                <input type="text" id="llm_model" name="llm.model" value="${cfg.llm.model || ''}" placeholder="gpt-4, claude-3-sonnet, etc.">
              </div>
              <div class="config-item">
                <label>API Key</label>
                <input type="password" id="llm_apiKey" name="llm.apiKey" value="${cfg.llm.apiKey || ''}" placeholder="Your API key">
              </div>
              <div class="config-item">
                <label>Base URL (for Ollama)</label>
                <input type="url" id="llm_baseUrl" name="llm.baseUrl" value="${cfg.llm.baseUrl || ''}" placeholder="http://localhost:11434">
              </div>
            </form>
          </div>

          <div class="section">
            <h2>Agent Settings</h2>
            <form id="configForm">
              <div class="config-item">
                <label>
                  <input type="checkbox" id="agent_autoStart" name="agent.autoStart" class="checkbox" ${cfg.agent.autoStart ? 'checked' : ''}>
                  Auto-start
                </label>
              </div>
              <div class="config-item">
                <label>Interval (ms)</label>
                <input type="number" id="agent_intervalMs" name="agent.intervalMs" value="${cfg.agent.intervalMs}" min="60000">
              </div>
              <div class="config-item">
                <label>Max Iterations</label>
                <input type="number" id="agent_maxIterations" name="agent.maxIterations" value="${cfg.agent.maxIterations}" min="1" max="100">
              </div>
            </form>
          </div>

          <div class="section">
            <h2>Actions</h2>
            <button type="button" class="btn" onclick="saveConfig()">Save Configuration</button>
            <button type="button" class="btn btn-secondary" onclick="resetConfig()">Reset to Defaults</button>
            <span id="message"></span>
          </div>

          <div class="section">
            <h2>Environment Variables</h2>
            <p>You can also set these environment variables before starting OpenQA:</p>
            <pre style="background: #334155; padding: 15px; border-radius: 6px; overflow-x: auto;"><code>export SAAS_URL="https://your-app.com"
export AGENT_AUTO_START=true
export LLM_PROVIDER=openai
export OPENAI_API_KEY="your-key"

openqa start</code></pre>
          </div>

          <script>
            async function saveConfig() {
              const form = document.getElementById('configForm');
              const formData = new FormData(form);
              const config = {};
              
              for (let [key, value] of formData.entries()) {
                if (value === '') continue;
                
                // Handle nested keys like "saas.url"
                const keys = key.split('.');
                let obj = config;
                for (let i = 0; i < keys.length - 1; i++) {
                  if (!obj[keys[i]]) obj[keys[i]] = {};
                  obj = obj[keys[i]];
                }
                
                // Convert checkbox values to boolean
                if (key.includes('autoStart')) {
                  obj[keys[keys.length - 1]] = value === 'on';
                } else if (key.includes('intervalMs') || key.includes('maxIterations')) {
                  obj[keys[keys.length - 1]] = parseInt(value);
                } else {
                  obj[keys[keys.length - 1]] = value;
                }
              }
              
              try {
                const response = await fetch('/api/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(config)
                });
                
                const result = await response.json();
                if (result.success) {
                  showMessage('Configuration saved successfully!', 'success');
                  setTimeout(() => location.reload(), 1500);
                } else {
                  showMessage('Failed to save configuration', 'error');
                }
              } catch (error) {
                showMessage('Error: ' + error.message, 'error');
              }
            }
            
            async function resetConfig() {
              if (confirm('Are you sure you want to reset all configuration to defaults?')) {
                try {
                  const response = await fetch('/api/config/reset', { method: 'POST' });
                  const result = await response.json();
                  if (result.success) {
                    showMessage('Configuration reset to defaults', 'success');
                    setTimeout(() => location.reload(), 1500);
                  }
                } catch (error) {
                  showMessage('Error: ' + error.message, 'error');
                }
              }
            }
            
            function showMessage(text, type) {
              const messageEl = document.getElementById('message');
              messageEl.textContent = text;
              messageEl.className = type;
              setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = '';
              }, 3000);
            }
          </script>
        </body>
      </html>
    `);
  });

  const server = app.listen(cfg.web.port, cfg.web.host, () => {
    console.log(chalk.cyan('\n📊 OpenQA Status:'));
    console.log(chalk.white(`  Agent: ${cfg.agent.autoStart ? 'Auto-start enabled' : 'Idle'}`));
    console.log(chalk.white(`  Target: ${cfg.saas.url || 'Not configured'}`));
    console.log(chalk.white(`  Dashboard: http://localhost:${cfg.web.port}`));
    console.log(chalk.white(`  Kanban: http://localhost:${cfg.web.port}/kanban`));
    console.log(chalk.white(`  Config: http://localhost:${cfg.web.port}/config`));
    console.log(chalk.gray('\nPress Ctrl+C to stop\n'));
    
    if (!cfg.agent.autoStart) {
      console.log(chalk.yellow('💡 Auto-start disabled. Agent is idle.'));
      console.log(chalk.cyan('   Set AGENT_AUTO_START=true to enable autonomous mode\n'));
    }
  });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  function broadcast(message: any) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send initial status
    ws.send(JSON.stringify({ 
      type: 'status', 
      data: { isRunning: false, target: cfg.saas.url || 'Not configured' }
    }));
    
    // Send mock agent data for now
    ws.send(JSON.stringify({ 
      type: 'agents', 
      data: [
        { name: 'Main Agent', status: 'idle', purpose: 'Autonomous testing' }
      ]
    }));
    
    // Simulate some activity for demo
    let activityCount = 0;
    const activityInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        const activities = [
          { type: 'info', message: '🔍 Scanning application for test targets', timestamp: new Date().toISOString() },
          { type: 'success', message: '✅ Found 5 testable components', timestamp: new Date().toISOString() },
          { type: 'warning', message: '⚠️ Authentication required for admin area', timestamp: new Date().toISOString() },
          { type: 'info', message: '🧪 Generating test scenarios', timestamp: new Date().toISOString() },
          { type: 'success', message: '✅ Created 3 test cases', timestamp: new Date().toISOString() }
        ];
        
        ws.send(JSON.stringify({ 
          type: 'activity', 
          data: activities[activityCount % activities.length]
        }));
        
        activityCount++;
      }
    }, 5000);
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clearInterval(activityInterval);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  });
}
