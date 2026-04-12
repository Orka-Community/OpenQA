import { OpenQAAgentV2 } from '../agent/index-v2.js';
import { ConfigManager } from '../agent/config/index.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { OpenQADatabase } from '../database/index.js';
import { createApiRouter } from './routes.js';
import { createAuthRouter } from './auth/router.js';
import { createEnvRouter } from './env-routes.js';
import { requireAuth, authOrRedirect } from './auth/middleware.js';
import { getDashboardHTML } from './dashboard.html.js';
import { getConfigHTML } from './config.html.js';
import { getKanbanHTML } from './kanban.html.js';
import { getLoginHTML } from './login.html.js';
import { getSetupHTML } from './setup.html.js';
import { getEnvHTML } from './env.html.js';
import { getSessionsHTML } from './sessions.html.js';
import { getIssuesHTML } from './issues.html.js';
import { getTestsHTML } from './tests.html.js';
import { getCoverageHTML } from './coverage.html.js';
import { getLogsHTML } from './logs.html.js';
import { logger } from '../agent/logger.js';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { z } from 'zod';

function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
    }
    req.body = result.data;
    next();
  };
}

const saasConfigSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().min(1).max(2000).optional(),
  apiEndpoints: z.array(z.string()).max(100).optional(),
  authType: z.enum(['none', 'api_key', 'bearer', 'basic']).optional(),
  testStrategy: z.enum(['api', 'e2e', 'unit', 'mixed']).optional(),
}).loose();

const quickSetupSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  url: z.string().min(1).max(2000),
});

const directiveSchema = z.object({
  directive: z.string().min(1).max(1000),
});

const repositorySchema = z.object({
  url: z.string().min(1).max(2000),
});

const localPathSchema = z.object({
  path: z.string().min(1).max(500),
});

const projectSetupSchema = z.object({
  repoPath: z.string().min(1).max(500),
  startServer: z.boolean().optional(),
});

const projectTestSchema = z.object({
  repoPath: z.string().min(1).max(500),
});

const brainRunSchema = z.object({
  maxIterations: z.number().int().min(1).max(100).optional(),
});

const generateTestSchema = z.object({
  type: z.string().min(1).max(100),
  target: z.string().min(1).max(500),
  context: z.string().max(2000).optional(),
});

const createAgentSchema = z.object({
  purpose: z.string().min(1).max(500),
});

const config = new ConfigManager();
const cfg = config.getConfigSync();
const db = new OpenQADatabase(cfg.database?.path || './data/openqa.json');

const app = express();

// Trust proxy for reverse proxies (Traefik, Nginx, etc.)
app.set('trust proxy', 1);

// CORS — allow configurable origins via env
const allowedOrigins = (process.env.CORS_ORIGINS || `http://localhost:${cfg.web.port}`).split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Global API rate limit: 300 req/min per IP
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  validate: { xForwardedForHeader: false }, // Disable validation for proxied requests
});
app.use('/api/', apiLimiter);

// Stricter limit on mutation endpoints: 30 req/min
const mutationLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
  validate: { xForwardedForHeader: false }, // Disable validation for proxied requests
});
app.use(['/api/agent/start', '/api/project/setup', '/api/project/test', '/api/brain/run', '/api/auth/login'], mutationLimiter);

const wss = new WebSocketServer({ noServer: true });

let agent: OpenQAAgentV2 | null = null;

// Auth routes (login, logout, me, change-password, setup, accounts) — before API guard
app.use(createAuthRouter(db));

// Env routes (environment variables management) — requires auth
app.use(createEnvRouter());

// Guard: all /api/* except the public auth endpoints
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const PUBLIC_PATHS = ['/auth/login', '/auth/logout', '/setup'];
  if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) return next();
  if (req.path === '/health') return next();
  return requireAuth(req, res, next);
});

// Shared data routes (sessions, bugs, kanban, config, health)
app.use(createApiRouter(db, config));

// Public pages
app.get('/login', async (_req, res) => {
  const count = await db.countUsers();
  if (count === 0) return res.redirect('/setup');
  res.send(getLoginHTML());
});

app.get('/setup', async (_req, res) => {
  const count = await db.countUsers();
  if (count > 0) return res.redirect('/login');
  res.send(getSetupHTML());
});

// Protected HTML pages
app.get('/', authOrRedirect(db), (_req, res) => {
  res.send(getDashboardHTML());
});

app.get('/config', authOrRedirect(db), (_req, res) => {
  res.send(getConfigHTML(cfg));
});

app.get('/config/env', authOrRedirect(db), (_req, res) => {
  res.send(getEnvHTML());
});

app.get('/kanban', authOrRedirect(db), (_req, res) => {
  res.send(getKanbanHTML());
});

app.get('/sessions', authOrRedirect(db), (_req, res) => {
  res.send(getSessionsHTML());
});

app.get('/issues', authOrRedirect(db), (_req, res) => {
  res.send(getIssuesHTML());
});

app.get('/tests', authOrRedirect(db), (_req, res) => {
  res.send(getTestsHTML());
});

app.get('/coverage', authOrRedirect(db), (_req, res) => {
  res.send(getCoverageHTML());
});

app.get('/logs', authOrRedirect(db), (_req, res) => {
  res.send(getLogsHTML());
});

// Override /api/status with agent-aware version
app.get('/api/status', (_req, res) => {
  const status = agent?.getStats() || { isRunning: false };
  res.json(status);
});

app.post('/api/agent/start', async (_req, res) => {
  if (agent?.getStats()?.isRunning) {
    return res.status(400).json({ error: 'Agent already running' });
  }

  try {
    const saasConfig = await db.getConfig('saas_config');
    if (!saasConfig) {
      return res.status(400).json({ error: 'SaaS not configured. Please configure target URL first.' });
    }

    const config = JSON.parse(saasConfig);
    const a = ensureAgent();
    a.configureSaaS(config); // Configure SaaS before running
    a.runAutonomous().catch(console.error);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/agent/stop', (_req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not running' });
  }
  
  agent.stop();
  res.json({ success: true });
});

// SaaS Configuration endpoints
app.get('/api/saas-config', (_req, res) => {
  res.json(ensureAgent().getSaaSConfig() || {});
});

app.post('/api/saas-config', validate(saasConfigSchema), (req, res) => {
  try {
    const config = ensureAgent().configureSaaS(req.body);
    res.json(config);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/saas-config/quick', validate(quickSetupSchema), (req, res) => {
  const { name, description, url } = req.body;

  try {
    const config = ensureAgent().quickSetup(name, description, url);
    res.json(config);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/saas-config/directive', validate(directiveSchema), (req, res) => {
  const { directive } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.addDirective(directive);
  res.json({ success: true });
});

app.post('/api/saas-config/repository', validate(repositorySchema), (req, res) => {
  const { url } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.setRepository(url);
  res.json({ success: true });
});

app.post('/api/saas-config/local-path', validate(localPathSchema), (req, res) => {
  const { path } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.setLocalPath(path);
  res.json({ success: true });
});

// ── Project Runner endpoints ──

app.post('/api/project/setup', validate(projectSetupSchema), async (req, res) => {
  const { repoPath, startServer } = req.body;

  try {
    const status = await ensureAgent().setupProject(repoPath, { startServer });
    res.json(status);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/project/status', (_req, res) => {
  res.json(agent ? agent.getProjectStatus() : { repoPath: '', projectType: null, installed: false, serverRunning: false, serverUrl: null, serverPid: null });
});

app.post('/api/project/test', validate(projectTestSchema), async (req, res) => {
  const { repoPath } = req.body;

  try {
    const result = await ensureAgent().runProjectTests(repoPath);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/project/stop', (_req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not running' });
  }

  agent.stop();
  agent = null;
  res.json({ success: true });
});

// Brain endpoints
app.post('/api/brain/analyze', async (_req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const analysis = await agent.analyze();
    res.json(analysis);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/brain/run', validate(brainRunSchema), async (req, res) => {
  const { maxIterations } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    // Run in background
    agent.runAutonomous(maxIterations || 10).catch(console.error);
    res.json({ success: true, message: 'Autonomous session started' });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/brain/generate-test', validate(generateTestSchema), async (req, res) => {
  const { type, target, context } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const test = await agent.generateTest(type, target, context);
    res.json(test);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/brain/create-agent', validate(createAgentSchema), async (req, res) => {
  const { purpose } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const dynamicAgent = await agent.createAgent(purpose);
    res.json(dynamicAgent);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/brain/run-test/:id', async (req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not configured' });
  }
  
  try {
    const result = await agent.runTest(req.params.id);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Generated tests and agents
app.get('/api/tests', (_req, res) => {
  if (!agent) {
    return res.json([]);
  }
  res.json(agent.getTests());
});

app.get('/api/dynamic-agents', (_req, res) => {
  if (!agent) {
    return res.json([]);
  }
  res.json(agent.getAgents());
});

const server = app.listen(cfg.web.port, cfg.web.host, () => {
  logger.info('OpenQA Web UI running', { url: `http://${cfg.web.host}:${cfg.web.port}` });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  logger.debug('WebSocket client connected');

  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      const status = agent?.getStats() || { isRunning: false };
      ws.send(JSON.stringify({ type: 'status', data: status }));
      
      // Send agent stats
      if (agent) {
        const agents = agent.getAgents();
        ws.send(JSON.stringify({ type: 'agents', data: agents }));
      }
    }
  }, 2000);

  ws.on('close', () => {
    clearInterval(interval);
    logger.debug('WebSocket client disconnected');
  });
});

// Forward agent events to WebSocket clients
function setupAgentEvents(a: OpenQAAgentV2) {
  const rawEvents = [
    // Brain events
    'test-generated', 'agent-created', 'test-started', 'test-completed',
    'thinking', 'analysis-complete', 'session-complete',
    // Git events
    'git-merge', 'git-pipeline-success',
    // Project runner events
    'install-start', 'install-progress', 'install-complete',
    'server-starting', 'server-ready', 'server-stopped',
    'test-start', 'test-progress', 'test-complete',
    // LLM resilience events
    'llm-retry', 'llm-fallback', 'llm-circuit-open',
  ];
  for (const event of rawEvents) {
    a.on(event, (data) => broadcast({ type: event, data }));
  }

  // Bridge raw agent events to dashboard-consumable WS message types
  a.on('thinking', (data) => {
    broadcast({ type: 'activity', data: { type: 'info', message: data?.thought || 'Agent thinking…', timestamp: new Date().toISOString() } });
  });
  a.on('test-generated', (data) => {
    broadcast({ type: 'activity', data: { type: 'success', message: `Test generated: ${data?.type || 'unknown'}`, timestamp: new Date().toISOString() } });
  });
  a.on('test-completed', (data) => {
    const passed = data?.passed ?? true;
    broadcast({ type: 'activity', data: { type: passed ? 'success' : 'error', message: `Test ${passed ? 'passed' : 'failed'}: ${data?.name || ''}`, timestamp: new Date().toISOString() } });
  });
  a.on('analysis-complete', (_data) => {
    broadcast({ type: 'activity', data: { type: 'info', message: 'Analysis complete', timestamp: new Date().toISOString() } });
  });
  a.on('session-complete', async () => {
    broadcast({ type: 'activity', data: { type: 'success', message: 'Session completed', timestamp: new Date().toISOString() } });
    // Push updated tasks and issues after session ends
    try {
      const [tasks, issues] = await Promise.all([db.getCurrentTasks(), db.getCurrentIssues()]);
      broadcast({ type: 'tasks', data: tasks });
      broadcast({ type: 'issues', data: issues });
    } catch { /* ignore */ }
  });
  a.on('llm-retry', (data) => {
    broadcast({ type: 'activity', data: { type: 'warning', message: `LLM retry (attempt ${data?.attempt}/${data?.maxRetries})`, timestamp: new Date().toISOString() } });
  });
  a.on('llm-fallback', (data) => {
    broadcast({ type: 'activity', data: { type: 'warning', message: `LLM fallback: ${data?.from} → ${data?.to}`, timestamp: new Date().toISOString() } });
  });
  a.on('install-complete', (data) => {
    broadcast({ type: 'activity', data: { type: data?.success ? 'success' : 'error', message: `Dependencies install ${data?.success ? 'complete' : 'failed'}`, timestamp: new Date().toISOString() } });
  });
  a.on('server-ready', (data) => {
    broadcast({ type: 'activity', data: { type: 'success', message: `Dev server ready at ${data?.url}`, timestamp: new Date().toISOString() } });
  });
  a.on('git-merge', (data) => {
    broadcast({ type: 'activity', data: { type: 'info', message: `Git merge detected on ${data?.branch}`, timestamp: new Date().toISOString() } });
  });
}

/** Ensure agent exists with events wired up */
function ensureAgent(): OpenQAAgentV2 {
  if (!agent) {
    agent = new OpenQAAgentV2();
    setupAgentEvents(agent);
  }
  return agent;
}

function broadcast(message: Record<string, unknown>) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

// Auto-start if configured
(async () => {
  const saasConfig = await db.getConfig('saas_config');
  if (cfg.agent?.autoStart && saasConfig) {
    try {
      const config = JSON.parse(saasConfig);
      const a = ensureAgent();
      a.configureSaaS(config); // Configure SaaS before running
      a.runAutonomous().catch((e) => logger.error('Auto-start failed', { error: e instanceof Error ? e.message : String(e) }));
    } catch (e) {
      logger.error('Failed to parse or configure SaaS', { error: e instanceof Error ? e.message : String(e) });
    }
  }
})();

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  if (agent) agent.stop();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Shutting down');
  if (agent) agent.stop();

  const forceExit = setTimeout(() => {
    logger.warn('Force exit after timeout');
    process.exit(0);
  }, 2000);
  
  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
});
