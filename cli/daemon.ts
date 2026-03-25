import { OpenQAAgentV2 } from '../agent/index-v2.js';
import { ConfigManager } from '../agent/config/index.js';
import express from 'express';
import { WebSocketServer } from 'ws';
import { OpenQADatabase } from '../database/index.js';

const config = new ConfigManager();
const cfg = config.getConfig();
const db = new OpenQADatabase(cfg.database.path);

const app = express();
app.use(express.json());

const wss = new WebSocketServer({ noServer: true });

let agent: OpenQAAgentV2 | null = null;

app.get('/api/status', (req, res) => {
  const status = agent?.getStatus() || { isRunning: false };
  res.json(status);
});

app.get('/api/sessions', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const sessions = db.getRecentSessions(limit);
  res.json(sessions);
});

app.get('/api/sessions/:id/actions', (req, res) => {
  const actions = db.getSessionActions(req.params.id);
  res.json(actions);
});

app.get('/api/bugs', (req, res) => {
  const status = req.query.status as any;
  const bugs = status ? db.getBugsByStatus(status) : db.getAllBugs();
  res.json(bugs);
});

app.get('/api/kanban/tickets', (req, res) => {
  const column = req.query.column as any;
  const tickets = column ? db.getKanbanTicketsByColumn(column) : db.getKanbanTickets();
  res.json(tickets);
});

app.patch('/api/kanban/tickets/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  db.updateKanbanTicket(id, updates);
  res.json({ success: true });
});

app.get('/api/config', (req, res) => {
  res.json(config.getConfig());
});

app.post('/api/config', (req, res) => {
  const { key, value } = req.body;
  config.set(key, value);
  res.json({ success: true });
});

app.post('/api/agent/start', async (req, res) => {
  if (agent?.getStatus().isRunning) {
    return res.status(400).json({ error: 'Agent already running' });
  }
  
  agent = new OpenQAAgent();
  agent.startAutonomous();
  res.json({ success: true });
});

app.post('/api/agent/stop', (req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not running' });
  }
  
  agent.stop();
  res.json({ success: true });
});

// SaaS Configuration endpoints
app.get('/api/saas-config', (req, res) => {
  if (!agent) {
    agent = new OpenQAAgentV2();
  }
  res.json(agent.getSaaSConfig() || {});
});

app.post('/api/saas-config', (req, res) => {
  if (!agent) {
    agent = new OpenQAAgentV2();
  }
  
  try {
    const config = agent.configureSaaS(req.body);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/saas-config/quick', (req, res) => {
  const { name, description, url } = req.body;
  
  if (!agent) {
    agent = new OpenQAAgentV2();
  }
  
  try {
    const config = agent.quickSetup(name, description, url);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/saas-config/directive', (req, res) => {
  const { directive } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.addDirective(directive);
  res.json({ success: true });
});

app.post('/api/saas-config/repository', (req, res) => {
  const { url } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.setRepository(url);
  res.json({ success: true });
});

app.post('/api/saas-config/local-path', (req, res) => {
  const { path } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.setLocalPath(path);
  res.json({ success: true });
});

// Brain endpoints
app.post('/api/brain/analyze', async (req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const analysis = await agent.analyze();
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/brain/run', async (req, res) => {
  const { maxIterations } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    // Run in background
    agent.runAutonomous(maxIterations || 10).catch(console.error);
    res.json({ success: true, message: 'Autonomous session started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/brain/generate-test', async (req, res) => {
  const { type, target, context } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const test = await agent.generateTest(type, target, context);
    res.json(test);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/brain/create-agent', async (req, res) => {
  const { purpose } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const dynamicAgent = await agent.createAgent(purpose);
    res.json(dynamicAgent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/brain/run-test/:id', async (req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const result = await agent.runTest(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generated tests and agents
app.get('/api/tests', (req, res) => {
  if (!agent) {
    return res.json([]);
  }
  res.json(agent.getTests());
});

app.get('/api/dynamic-agents', (req, res) => {
  if (!agent) {
    return res.json([]);
  }
  res.json(agent.getAgents());
});

const server = app.listen(cfg.web.port, cfg.web.host, () => {
  console.log(`✅ OpenQA Web UI running on http://${cfg.web.host}:${cfg.web.port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      const status = agent?.getStatus() || { isRunning: false };
      ws.send(JSON.stringify({ type: 'status', data: status }));
      
      // Send specialist statuses
      if (agent) {
        const specialists = agent.getSpecialistStatuses();
        ws.send(JSON.stringify({ type: 'specialists', data: specialists }));
      }
    }
  }, 2000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('WebSocket client disconnected');
  });
});

// Forward agent events to WebSocket clients
function setupAgentEvents(agent: OpenQAAgentV2) {
  agent.on('test-generated', (test) => {
    broadcast({ type: 'test-generated', data: test });
  });
  
  agent.on('agent-created', (dynamicAgent) => {
    broadcast({ type: 'agent-created', data: dynamicAgent });
  });
  
  agent.on('test-started', (test) => {
    broadcast({ type: 'test-started', data: test });
  });
  
  agent.on('test-completed', (test) => {
    broadcast({ type: 'test-completed', data: test });
  });
  
  agent.on('thinking', (thought) => {
    broadcast({ type: 'thinking', data: thought });
  });
  
  agent.on('analysis-complete', (analysis) => {
    broadcast({ type: 'analysis-complete', data: analysis });
  });
  
  agent.on('session-complete', (stats) => {
    broadcast({ type: 'session-complete', data: stats });
  });
  
  agent.on('git-merge', (event) => {
    broadcast({ type: 'git-merge', data: event });
  });
  
  agent.on('git-pipeline-success', (event) => {
    broadcast({ type: 'git-pipeline-success', data: event });
  });
}

function broadcast(message: any) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

// Auto-start if configured
if (cfg.agent.autoStart && db.getConfig('saas_config')) {
  agent = new OpenQAAgentV2();
  setupAgentEvents(agent);
  agent.runAutonomous().catch(console.error);
}

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (agent) agent.stop();
  server.close(() => {
    process.exit(0);
  });
});
