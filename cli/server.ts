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
    const { key, value } = req.body;
    await config.set(key, value);
    res.json({ success: true });
  });

  // Simple HTML pages for Web UI, Kanban, and Config
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenQA - Dashboard</title>
          <style>
            body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
            h1 { color: #38bdf8; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
            .status.running { background: #10b981; color: white; }
            .status.idle { background: #f59e0b; color: white; }
            a { color: #38bdf8; text-decoration: none; }
            a:hover { text-decoration: underline; }
            nav { margin: 20px 0; }
            nav a { margin-right: 20px; }
          </style>
        </head>
        <body>
          <h1>🤖 OpenQA Dashboard</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/kanban">Kanban</a>
            <a href="/config">Config</a>
          </nav>
          <div class="card">
            <h2>Status</h2>
            <p>Agent: <span class="status idle">Idle</span></p>
            <p>Target: ${cfg.saas.url || 'Not configured'}</p>
            <p>Auto-start: ${cfg.agent.autoStart ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div class="card">
            <h2>Quick Links</h2>
            <ul>
              <li><a href="/kanban">View Kanban Board</a></li>
              <li><a href="/config">Configure OpenQA</a></li>
            </ul>
          </div>
          <div class="card">
            <h2>Getting Started</h2>
            <p>Configure your SaaS application target and start testing:</p>
            <ol>
              <li>Set SAAS_URL environment variable or use the <a href="/config">Config page</a></li>
              <li>Enable auto-start: <code>export AGENT_AUTO_START=true</code></li>
              <li>Restart OpenQA</li>
            </ol>
          </div>
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
            .config-item .value { background: #334155; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; }
            code { background: #334155; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
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
            <div class="config-item">
              <label>URL</label>
              <div class="value">${cfg.saas.url || 'Not configured'}</div>
            </div>
            <div class="config-item">
              <label>Auth Type</label>
              <div class="value">${cfg.saas.authType}</div>
            </div>
          </div>

          <div class="section">
            <h2>LLM Configuration</h2>
            <div class="config-item">
              <label>Provider</label>
              <div class="value">${cfg.llm.provider}</div>
            </div>
            <div class="config-item">
              <label>Model</label>
              <div class="value">${cfg.llm.model || 'default'}</div>
            </div>
          </div>

          <div class="section">
            <h2>Agent Settings</h2>
            <div class="config-item">
              <label>Auto-start</label>
              <div class="value">${cfg.agent.autoStart ? 'Enabled' : 'Disabled'}</div>
            </div>
            <div class="config-item">
              <label>Interval</label>
              <div class="value">${cfg.agent.intervalMs}ms</div>
            </div>
            <div class="config-item">
              <label>Max Iterations</label>
              <div class="value">${cfg.agent.maxIterations}</div>
            </div>
          </div>

          <div class="section">
            <h2>How to Configure</h2>
            <p>Set environment variables before starting OpenQA:</p>
            <pre style="background: #334155; padding: 15px; border-radius: 6px; overflow-x: auto;"><code>export SAAS_URL="https://your-app.com"
export AGENT_AUTO_START=true
export LLM_PROVIDER=openai
export OPENAI_API_KEY="your-key"

openqa start</code></pre>
          </div>
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

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
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
