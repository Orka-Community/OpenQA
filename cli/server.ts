import { ConfigManager } from '../agent/config/index.js';
import express from 'express';
import { WebSocketServer } from 'ws';
import { OpenQADatabase } from '../database/index.js';
import { createApiRouter } from './routes.js';
import { getDashboardHTML } from './dashboard.html.js';
import { getKanbanHTML } from './kanban.html.js';
import { getConfigHTML } from './config.html.js';
import chalk from 'chalk';

export async function startWebServer() {
  const config = new ConfigManager();
  const cfg = config.getConfigSync();
  const db = new OpenQADatabase('./data/openqa.json');

  const app = express();
  app.use(express.json());

  const wss = new WebSocketServer({ noServer: true });

  // Shared data routes (sessions, bugs, kanban, config, health)
  app.use(createApiRouter(db, config));

  // Human interventions
  app.post('/api/intervention/:id', async (req, res) => {
    const { id } = req.params;
    const { response } = req.body;
    
    console.log(`Intervention ${id} ${response} by user`);
    
    res.json({ success: true, message: `Intervention ${response}d` });
  });

  // Test connection endpoint
  app.post('/api/test-connection', async (req, res) => {
    try {
      const cfg = config.getConfigSync();
      
      // Test SaaS connection if URL is configured
      if (cfg.saas.url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(cfg.saas.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: cfg.saas.authType === 'basic' && cfg.saas.username && cfg.saas.password ? {
              'Authorization': 'Basic ' + Buffer.from(`${cfg.saas.username}:${cfg.saas.password}`).toString('base64')
            } : {}
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            res.json({ success: true, message: 'SaaS connection successful' });
          } else {
            res.json({ success: false, message: 'SaaS connection failed' });
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } else {
        res.json({ success: false, message: 'No SaaS URL configured' });
      }
    } catch (error: unknown) {
      res.json({ success: false, message: 'Connection error: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Start session endpoint
  app.post('/api/start', async (req, res) => {
    try {
      // This would typically start the agent session
      console.log('Starting agent session...');
      res.json({ success: true, message: 'Session started' });
    } catch (error: unknown) {
      res.json({ success: false, message: 'Failed to start session: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Stop session endpoint
  app.post('/api/stop', async (req, res) => {
    try {
      console.log('Stopping agent session...');
      res.json({ success: true, message: 'Session stopped' });
    } catch (error: unknown) {
      res.json({ success: false, message: 'Failed to stop session: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Active agents
  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await db.getActiveAgents();
      res.json(agents);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Current tasks
  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await db.getCurrentTasks();
      res.json(tasks);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Issues encountered
  app.get('/api/issues', async (req, res) => {
    try {
      const issues = await db.getCurrentIssues();
      res.json(issues);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Professional Dashboard with Charts and Agent Hierarchy
  app.get('/', (req, res) => {
    res.send(getDashboardHTML());
  });

  app.get('/kanban', (req, res) => {
    res.send(getKanbanHTML());
  });

  app.get('/config', (req, res) => {
    res.send(getConfigHTML(config.getConfigSync()));
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

  function broadcast(message: Record<string, unknown>) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

wss.on('connection', async (ws) => {
    console.log('WebSocket client connected');
    
    try {
      // Get real data from database
      const sessions = await db.getRecentSessions(1);
      const currentSession = sessions[0];
      const agents = await db.getActiveAgents();
      const tasks = await db.getCurrentTasks();
      const issues = await db.getCurrentIssues();
      
      // Send initial status with real data
      ws.send(JSON.stringify({ 
        type: 'status', 
        data: { 
          isRunning: currentSession?.status === 'running' || false, 
          target: cfg.saas.url || 'Not configured',
          sessionId: currentSession?.id || null
        }
      }));
      
      // Send real agent data
      ws.send(JSON.stringify({ 
        type: 'agents', 
        data: agents
      }));
      
      // Send real session data if exists
      if (currentSession) {
        ws.send(JSON.stringify({ 
          type: 'session', 
          data: {
            active_agents: agents.length,
            total_actions: currentSession.total_actions || 0,
            bugs_found: currentSession.bugs_found || 0,
            success_rate: currentSession.total_actions > 0 ? 
              Math.round(((currentSession.total_actions - (currentSession.bugs_found || 0)) / currentSession.total_actions) * 100) : 0,
            timestamp: new Date().toISOString(),
            agents: agents,
            tasks: tasks,
            issues: issues
          }
        }));
      }
      
      // Send real tasks
      ws.send(JSON.stringify({ 
        type: 'tasks', 
        data: tasks
      }));
      
      // Send real issues
      ws.send(JSON.stringify({ 
        type: 'issues', 
        data: issues
      }));
      
      // Generate realistic activities based on current session
      let activityCount = 0;
      const activityInterval = setInterval(async () => {
        if (ws.readyState === ws.OPEN) {
          // Get fresh data
          const freshSessions = await db.getRecentSessions(1);
          const freshSession = freshSessions[0];
          
          if (freshSession) {
            const activities = [
              { type: 'info', message: `🔍 Session ${freshSession.id} - Analyzing application`, timestamp: new Date().toISOString() },
              { type: 'success', message: `✅ Completed ${freshSession.total_actions || 0} test actions`, timestamp: new Date().toISOString() },
              { type: 'warning', message: `⚠️ Found ${freshSession.bugs_found || 0} issues to review`, timestamp: new Date().toISOString() },
              { type: 'info', message: `🧪 Success rate: ${freshSession.total_actions > 0 ? Math.round(((freshSession.total_actions - (freshSession.bugs_found || 0)) / freshSession.total_actions) * 100) : 0}%`, timestamp: new Date().toISOString() },
              { type: 'success', message: `✅ ${agents.filter(a => a.status === 'running').length} agents active`, timestamp: new Date().toISOString() }
            ];
            
            ws.send(JSON.stringify({ 
              type: 'activity', 
              data: activities[activityCount % activities.length]
            }));
          } else {
            ws.send(JSON.stringify({ 
              type: 'activity', 
              data: { type: 'info', message: '🔄 Waiting for session to start...', timestamp: new Date().toISOString() }
            }));
          }
          
          activityCount++;
        }
      }, 8000); // Update every 8 seconds with real data
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        clearInterval(activityInterval);
      });
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        data: { message: 'Failed to load initial data' }
      }));
    }
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
