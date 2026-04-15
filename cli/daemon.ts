import { OpenQAAgentV2 } from '../agent/index-v2.js';
import { ConfigManager } from '../agent/config/index.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { OpenQASQLiteDatabase } from '../database/index.js';
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
import { getSessionDetailHTML } from './session-detail.html.js';
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
const dbPath = (() => {
  const raw = process.env.DB_PATH || cfg.database?.path || './data/openqa.db';
  // Ensure SQLite extension — migrate any legacy .json path transparently
  return raw.endsWith('.json') ? raw.replace(/\.json$/, '.db') : raw;
})();
const db = new OpenQASQLiteDatabase(dbPath);

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

app.get('/config', authOrRedirect(db), async (_req, res) => {
  // Load fresh config from database on every request
  const freshConfig = await config.getConfig();
  res.send(getConfigHTML(freshConfig));
});

app.get('/config/env', authOrRedirect(db), (_req, res) => {
  res.send(getEnvHTML());
});

app.get('/kanban', authOrRedirect(db), (_req, res) => {
  res.send(getKanbanHTML());
});

app.get('/sessions/:sessionId', authOrRedirect(db), (req, res) => {
  res.send(getSessionDetailHTML(req.params.sessionId));
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
app.get('/api/status', async (_req, res) => {
  const a = await ensureAgent();
  const status = a.getStats();
  res.json(status);
});

app.post('/api/agent/start', async (_req, res) => {
  const a = await ensureAgent();
  if (a.getStats().isRunning) {
    return res.status(400).json({ error: 'Agent already running' });
  }

  try {
    // Read saas config through ConfigManager so env vars + DB config are merged
    const saasUrl = await config.get('saas.url');
    if (!saasUrl) {
      return res.status(400).json({ error: 'Target URL not configured. Go to /config to set the target application URL.' });
    }

    const saasConfig = {
      name: await config.get('saas.name') || 'Target Application',
      description: await config.get('saas.description') || 'Application to test',
      url: saasUrl,
      auth: {
        type: ((await config.get('saas.authType')) || 'none') as 'none' | 'basic' | 'oauth' | 'session',
        credentials: {
          username: await config.get('saas.username') || '',
          password: await config.get('saas.password') || ''
        }
      }
    };

    const a = await ensureAgent();
    await a.configureSaaS(saasConfig); // Configure SaaS before running
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
app.get('/api/saas-config', async (_req, res) => {
  const a = await ensureAgent();
  res.json(await a.getSaaSConfig() || {});
});

app.post('/api/saas-config', validate(saasConfigSchema), async (req, res) => {
  try {
    const a = await ensureAgent();
    const config = await a.configureSaaS(req.body);
    res.json(config);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/saas-config/quick', validate(quickSetupSchema), async (req, res) => {
  const { name, description, url } = req.body;

  try {
    const a = await ensureAgent();
    const config = await a.quickSetup(name, description, url);
    res.json(config);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/saas-config/directive', validate(directiveSchema), async (req, res) => {
  const { directive } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  await agent.addDirective(directive);
  res.json({ success: true });
});

app.post('/api/saas-config/repository', validate(repositorySchema), async (req, res) => {
  const { url } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  await agent.setRepository(url);
  res.json({ success: true });
});

app.post('/api/saas-config/local-path', validate(localPathSchema), async (req, res) => {
  const { path } = req.body;
  
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  await agent.setLocalPath(path);
  res.json({ success: true });
});

// ── Project Runner endpoints ──

app.post('/api/project/setup', validate(projectSetupSchema), async (req, res) => {
  const { repoPath, startServer } = req.body;

  try {
    const a = await ensureAgent();
  const status = await a.setupProject(repoPath, { startServer });
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
    const a = await ensureAgent();
  const result = await a.runProjectTests(repoPath);
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
    const a = await ensureAgent();
    const dynamicAgent = await a.createAgent(purpose);
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

// In-memory dynamic agents (created at runtime by the live agent)
app.get('/api/dynamic-agents', (_req, res) => {
  if (!agent) {
    return res.json([]);
  }
  res.json(agent.getAgents());
});

// DB-backed agents — derived from session actions, always available
app.get('/api/agents', async (_req, res) => {
  try {
    const agents = await db.getActiveAgents();
    res.json(agents);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Specialist agents (real-time status from Brain)
app.get('/api/specialists', (_req, res) => {
  if (!agent) {
    return res.json([]);
  }
  res.json(agent.getSpecialistStatuses());
});

const server = app.listen(cfg.web.port, cfg.web.host, () => {
  logger.info('OpenQA Web UI running', { url: `http://${cfg.web.host}:${cfg.web.port}` });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', async (ws) => {
  logger.debug('WebSocket client connected');

  // ── Push initial snapshot from DB immediately on connect ──────────────────
  try {
    const [sessions, tasks, issues] = await Promise.all([
      db.getRecentSessions(10),
      db.getCurrentTasks(),
      db.getCurrentIssues(),
    ]);
    const currentSession = sessions[0];
    const saasUrl = await config.get('saas.url');

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          isRunning: agent?.getStats().isRunning ?? (currentSession?.status === 'running'),
          target: saasUrl || 'Not configured',
          sessionId: currentSession?.id || null,
        },
      }));
      ws.send(JSON.stringify({ type: 'sessions', data: sessions }));
      ws.send(JSON.stringify({ type: 'tasks', data: tasks }));
      ws.send(JSON.stringify({ type: 'issues', data: issues }));

      // Kanban badge + DB agents
      const [kanbanTickets, dbAgents] = await Promise.all([
        db.getKanbanTickets(),
        db.getActiveAgents(),
      ]);
      const openTickets = kanbanTickets.filter(t => t.column !== 'done').length;
      ws.send(JSON.stringify({ type: 'kanban-stats', data: { count: openTickets } }));
      ws.send(JSON.stringify({ type: 'agents', data: dbAgents }));
      if (agent) {
        ws.send(JSON.stringify({ type: 'dynamic-agents', data: agent.getAgents() }));
        ws.send(JSON.stringify({ type: 'specialists', data: agent.getSpecialistStatuses() }));
      }

      if (currentSession) {
        ws.send(JSON.stringify({
          type: 'session',
          data: {
            active_agents: dbAgents.filter(a => a.status === 'running').length,
            total_actions: currentSession.total_actions || 0,
            bugs_found: currentSession.bugs_found || 0,
            success_rate: currentSession.total_actions > 0
              ? Math.round(((currentSession.total_actions - (currentSession.bugs_found || 0)) / currentSession.total_actions) * 100)
              : 0,
            timestamp: new Date().toISOString(),
          },
        }));
      }
    }
  } catch (e) {
    logger.warn('Failed to push initial WS snapshot', { error: e instanceof Error ? e.message : String(e) });
  }

  // ── Periodic refresh every 3 s ─────────────────────────────────────────────
  const interval = setInterval(async () => {
    if (ws.readyState !== ws.OPEN) return;

    try {
      // Agent runtime stats — include target URL so dashboard always shows truth
      const saasUrl = await config.get('saas.url');
      // If URL is now available but agent isn't configured yet, auto-configure
      if (agent && saasUrl) {
        const currentConfig = await agent.getSaaSConfig();
        if (!currentConfig?.url) {
          try {
            await agent.configureSaaS({
            name: await config.get('saas.name') || 'Target Application',
            description: await config.get('saas.description') || 'Application to test',
            url: saasUrl,
            auth: {
              type: ((await config.get('saas.authType')) || 'none') as 'none' | 'basic' | 'oauth' | 'session',
              credentials: {
                username: await config.get('saas.username') || '',
                password: await config.get('saas.password') || '',
              },
            },
          });
          } catch { /* non-critical */ }
        }
      }
      const status = { ...(agent?.getStats() || { isRunning: false }), target: saasUrl || 'Not configured' };
      ws.send(JSON.stringify({ type: 'status', data: status }));

      // DB data refresh
      const [sessions, tasks, issues, kanbanTickets, dbAgents, coverage, coverageStats] = await Promise.all([
        db.getRecentSessions(10),
        db.getCurrentTasks(),
        db.getCurrentIssues(),
        db.getKanbanTickets(),
        db.getActiveAgents(),
        db.getAggregatedCoverage(),
        db.getCoverageStats(),
      ]);
      ws.send(JSON.stringify({ type: 'sessions', data: sessions }));

      // Push session metrics every 3s so the Performance chart stays live
      const latest = sessions[0];
      if (latest) {
        ws.send(JSON.stringify({
          type: 'session',
          data: {
            active_agents: dbAgents.filter(a => a.status === 'running').length,
            total_actions: latest.total_actions || 0,
            bugs_found: latest.bugs_found || 0,
            success_rate: latest.total_actions > 0
              ? Math.round(((latest.total_actions - (latest.bugs_found || 0)) / latest.total_actions) * 100)
              : 0,
            timestamp: new Date().toISOString(),
          },
        }));
      }

      ws.send(JSON.stringify({ type: 'tasks', data: tasks }));
      ws.send(JSON.stringify({ type: 'issues', data: issues }));

      // Kanban badge
      const open = kanbanTickets.filter(t => t.column !== 'done').length;
      ws.send(JSON.stringify({ type: 'kanban-stats', data: { count: open } }));

      // DB agents drive the hierarchy/agents panel (consistent shape)
      ws.send(JSON.stringify({ type: 'agents', data: dbAgents }));
      // Live dynamic-agents (different type) go to their own message
      if (agent) {
        ws.send(JSON.stringify({ type: 'dynamic-agents', data: agent.getAgents() }));
        ws.send(JSON.stringify({ type: 'tests', data: agent.getTests() }));
        ws.send(JSON.stringify({ type: 'specialists', data: agent.getSpecialistStatuses() }));
      }
      
      // Coverage data
      ws.send(JSON.stringify({ type: 'coverage', data: coverage }));
      ws.send(JSON.stringify({ type: 'coverage-stats', data: coverageStats }));
    } catch {/* ignore transient errors */}
  }, 3000);

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
    // Specialist events
    'specialist-created', 'specialist-started', 'specialist-completed', 'specialist-failed',
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
    // Broadcast updated tests list
    broadcast({ type: 'tests', data: agent?.getTests() || [] });
  });
  a.on('test-started', (data) => {
    broadcast({ type: 'activity', data: { type: 'info', message: `Test started: ${data?.name || 'unknown'}`, timestamp: new Date().toISOString() } });
    broadcast({ type: 'tests', data: agent?.getTests() || [] });
  });
  a.on('test-completed', (data) => {
    const passed = data?.status === 'passed';
    broadcast({ type: 'activity', data: { type: passed ? 'success' : 'error', message: `Test ${passed ? 'passed' : 'failed'}: ${data?.name || ''}`, timestamp: new Date().toISOString() } });
    // Broadcast updated tests list
    broadcast({ type: 'tests', data: agent?.getTests() || [] });
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
  a.on('specialist-created', (data) => {
    broadcast({ type: 'activity', data: { type: 'info', message: `Specialist created: ${data?.type}`, timestamp: new Date().toISOString() } });
    broadcast({ type: 'specialists', data: agent?.getSpecialistStatuses() || [] });
  });
  a.on('specialist-started', (data) => {
    broadcast({ type: 'activity', data: { type: 'info', message: `Specialist started: ${data?.type}`, timestamp: new Date().toISOString() } });
    broadcast({ type: 'specialists', data: agent?.getSpecialistStatuses() || [] });
  });
  a.on('specialist-completed', async (data) => {
    broadcast({ type: 'activity', data: { type: 'success', message: `Specialist completed: ${data?.type} (${data?.findings || 0} findings)`, timestamp: new Date().toISOString() } });
    broadcast({ type: 'specialists', data: agent?.getSpecialistStatuses() || [] });
    // Update metrics in real-time
    await broadcastLatestMetrics();
  });
  a.on('specialist-failed', async (data) => {
    broadcast({ type: 'activity', data: { type: 'error', message: `Specialist failed: ${data?.type}`, timestamp: new Date().toISOString() } });
    broadcast({ type: 'specialists', data: agent?.getSpecialistStatuses() || [] });
    // Update metrics in real-time
    await broadcastLatestMetrics();
  });
}

/** Ensure agent exists with events wired up and SaaS configured */
async function ensureAgent(): Promise<OpenQAAgentV2> {
  if (!agent) {
    agent = new OpenQAAgentV2();
    setupAgentEvents(agent);
    
    // Auto-configure SaaS — read via ConfigManager so env vars + DB are merged
    try {
      const saasUrl = await config.get('saas.url');
      if (saasUrl) {
        const saasConfig = {
          name: await config.get('saas.name') || 'Target Application',
          description: await config.get('saas.description') || 'Application to test',
          url: saasUrl,
          auth: {
            type: ((await config.get('saas.authType')) || 'none') as 'none' | 'basic' | 'oauth' | 'session',
            credentials: {
              username: await config.get('saas.username') || '',
              password: await config.get('saas.password') || ''
            }
          }
        };
        await agent.configureSaaS(saasConfig);
        logger.info('Agent auto-configured with SaaS settings', { url: saasUrl });
      }
    } catch (e) {
      logger.warn('No SaaS config found, agent not auto-configured');
    }
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

async function broadcastLatestMetrics() {
  try {
    const sessions = await db.getRecentSessions(1);
    const latest = sessions[0];
    if (latest && agent) {
      const dbAgents = await db.getActiveAgents();
      broadcast({
        type: 'session',
        data: {
          active_agents: dbAgents.filter(a => a.status === 'running').length,
          total_actions: latest.total_actions || 0,
          bugs_found: latest.bugs_found || 0,
          success_rate: latest.total_actions > 0
            ? Math.round(((latest.total_actions - (latest.bugs_found || 0)) / latest.total_actions) * 100)
            : 0,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (e) {
    // Non-critical
  }
}

// Initialize agent on startup (loads SaaS config from database)
(async () => {
  try {
    // On startup, mark any lingering 'running' sessions as 'stopped'
    try {
      const staleSessions = await db.getRecentSessions(200);
      const stale = staleSessions.filter((s: { status: string }) => s.status === 'running');
      for (const s of stale) {
        await db.updateSession(s.id, { status: 'completed', ended_at: new Date().toISOString() });
      }
      if (stale.length > 0) logger.info(`Marked ${stale.length} stale sessions as stopped on startup`);
    } catch (cleanupErr) {
      logger.warn('Failed to cleanup stale sessions', { error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr) });
    }

    // Always create agent to load SaaS config (even if not auto-starting)
    await ensureAgent();
    logger.info('Agent initialized with SaaS configuration');
    
    // Auto-start agent if configured
    if (cfg.agent?.autoStart) {
      const a = await ensureAgent();
      if (a.getStats().isRunning) {
        logger.info('Agent already running');
      } else {
        a.runAutonomous().catch((e: Error) => logger.error('Auto-start failed', { error: e.message }));
      }
    }
  } catch (e) {
    logger.error('Failed to initialize agent', { error: e instanceof Error ? e.message : String(e) });
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
