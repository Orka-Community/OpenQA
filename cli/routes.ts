import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { OpenQADatabase, Bug, KanbanTicket } from '../database/index.js';
import { ConfigManager } from '../agent/config/index.js';
import { ExportService, type ExportFormat } from '../agent/export/index.js';
import { ReportGenerator } from '../agent/export/report-generator.js';
import { getOpenAPISpec } from '../agent/openapi/spec.js';
import { metrics } from '../agent/metrics.js';

// ── Body validation ────────────────────────────────────────────────────────────

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

const kanbanCreateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  column: z.enum(['backlog', 'todo', 'in_progress', 'done']).optional(),
});

const kanbanUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  column: z.enum(['backlog', 'todo', 'in_progress', 'done']).optional(),
  assignee: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}).loose();

const configUpdateSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())])
);

const exportFormatSchema = z.enum(['json', 'csv', 'html']);

export function createApiRouter(db: OpenQADatabase, config: ConfigManager): Router {
  const router = Router();

  // Count every HTTP request
  router.use((_req, _res, next) => { metrics.inc('http_requests'); next(); });

  // Health check (enriched)
  router.get('/health', async (_req, res) => {
    const snap = metrics.snapshot();
    let dbOk = false;
    try { await db.getStorageStats(); dbOk = true; } catch { /* db unreachable */ }
    res.json({
      status: dbOk ? 'ok' : 'degraded',
      version: '1.3.4',
      uptime: snap.uptimeSeconds,
      memory: snap.memory,
      db: dbOk,
    });
  });

  // Metrics
  router.get('/api/metrics', (_req, res) => {
    res.json(metrics.snapshot());
  });

  // Status
  router.get('/api/status', (_req, res) => {
    res.json({ isRunning: true });
  });

  // Sessions
  router.get('/api/sessions', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await db.getRecentSessions(limit);
    res.json(sessions);
  });

  router.get('/api/sessions/:id', async (req, res) => {
    try {
      const session = await db.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/api/sessions/:id/actions', async (req, res) => {
    const actions = await db.getSessionActions(req.params.id);
    res.json(actions);
  });

  // Bugs
  router.get('/api/bugs', async (req, res) => {
    const status = req.query.status as string | undefined;
    const bugs = status ? await db.getBugsByStatus(status as Bug['status']) : await db.getAllBugs();
    res.json(bugs);
  });

  // Kanban
  router.get('/api/kanban/tickets', async (req, res) => {
    const column = req.query.column as string | undefined;
    const tickets = column ? await db.getKanbanTicketsByColumn(column as KanbanTicket['column']) : await db.getKanbanTickets();
    res.json(tickets);
  });

  router.get('/api/kanban', async (_req, res) => {
    const tickets = await db.getKanbanTickets();
    res.json(tickets);
  });

  router.post('/api/kanban', validate(kanbanCreateSchema), async (req, res) => {
    try {
      const { title, description, priority, column } = req.body;
      const ticket = await db.createKanbanTicket({
        title: title || 'New Ticket',
        description: description || '',
        priority: priority || 'medium',
        column: column || 'backlog'
      });
      res.json(ticket);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.put('/api/kanban/:id', validate(kanbanUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await db.updateKanbanTicket(id, updates);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.delete('/api/kanban/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.deleteKanbanTicket(id);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.patch('/api/kanban/tickets/:id', validate(kanbanUpdateSchema), async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    await db.updateKanbanTicket(id, updates);
    res.json({ success: true });
  });

  // Config
  router.get('/api/config', async (_req, res) => {
    const cfg = await config.getConfig();
    // Ensure proper JSON serialization
    res.json(JSON.parse(JSON.stringify(cfg)));
  });

  router.post('/api/config', validate(configUpdateSchema), async (req, res) => {
    try {
      const configData = req.body;
      // Handle nested config objects properly
      for (const [section, values] of Object.entries(configData)) {
        if (typeof values === 'object' && values !== null) {
          for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
            await config.set(`${section}.${key}`, String(value));
          }
        } else {
          await config.set(section, String(values));
        }
      }
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/api/config/reset', async (_req, res) => {
    try {
      await db.clearAllConfig();
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Test connection — verify a URL is reachable, with optional auth and latency
  router.post('/api/test-connection', async (req, res) => {
    const { url: urlStr, authType, username, password, token } =
      req.body as { url?: string; authType?: string; username?: string; password?: string; token?: string };

    if (!urlStr) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }

    // Build auth headers
    const headers: Record<string, string> = {};
    if (authType === 'basic' && username) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password || ''}`).toString('base64');
    } else if ((authType === 'bearer' || authType === 'session') && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Try HEAD first — many servers reject HEAD; fall back to GET
      let response = await fetch(urlStr, {
        method: 'HEAD',
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      if (response.status === 405) {
        // HEAD not allowed — retry with GET
        response = await fetch(urlStr, {
          method: 'GET',
          headers,
          signal: controller.signal,
          redirect: 'follow',
        });
      }

      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      // Categorise the result for actionable feedback
      const status = response.status;
      let category: string;
      let message: string;

      if (status >= 200 && status < 300) {
        category = 'ok';
        message = `Reachable — HTTP ${status}`;
      } else if (status === 401) {
        category = 'auth_failed';
        message = `HTTP 401 — authentication required or credentials rejected`;
      } else if (status === 403) {
        category = 'forbidden';
        message = `HTTP 403 — server reachable but access is forbidden`;
      } else if (status === 404) {
        category = 'not_found';
        message = `HTTP 404 — URL not found on server`;
      } else if (status >= 500) {
        category = 'server_error';
        message = `HTTP ${status} — server error`;
      } else {
        category = 'unexpected';
        message = `HTTP ${status}`;
      }

      res.json({
        success: status >= 200 && status < 400,
        status,
        category,
        message,
        latency,
        authenticated: Object.keys(headers).length > 0,
      });
    } catch (err: unknown) {
      const latency = Date.now() - start;
      const raw = err instanceof Error ? err.message : String(err);
      const isTimeout = raw.includes('abort') || raw.includes('timeout');
      res.json({
        success: false,
        category: isTimeout ? 'timeout' : 'network_error',
        message: isTimeout
          ? `Timeout after ${latency}ms — server unreachable or too slow`
          : `Network error — ${raw}`,
        latency,
        authenticated: Object.keys(headers).length > 0,
      });
    }
  });

  // Test GitHub connectivity — uses GitHub API with token if configured
  router.post('/api/test-github', async (req, res) => {
    try {
      const cfg = await config.getAll();
      const { owner, repo, token } = cfg.github ?? {};

      if (!owner || !repo) {
        return res.json({ success: false, message: 'GITHUB_OWNER and GITHUB_REPO must both be set' });
      }

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'OpenQA/2.1',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const t0 = Date.now();
      let ghRes: Awaited<ReturnType<typeof fetch>>;
      try {
        ghRes = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(8000) });
      } catch (_err: unknown) {
        return res.json({ success: false, message: 'Network error — GitHub unreachable', latency: Date.now() - t0 });
      }
      const latency = Date.now() - t0;

      if (ghRes.ok) {
        const data = await ghRes.json().catch(() => ({}));
        const visibility = (data as Record<string, unknown>).private ? 'private' : 'public';
        return res.json({
          success: true,
          message: `${owner}/${repo} found (${visibility})`,
          latency,
          authenticated: !!token,
        });
      }

      if (ghRes.status === 401) {
        return res.json({ success: false, message: 'Invalid or expired GitHub token', latency });
      }
      if (ghRes.status === 403) {
        return res.json({ success: false, message: 'Access forbidden — check token permissions', latency });
      }
      if (ghRes.status === 404) {
        return res.json({
          success: false,
          message: token
            ? `Repo ${owner}/${repo} not found or token has no access`
            : `Repo ${owner}/${repo} not found (or private — add GITHUB_TOKEN)`,
          latency,
        });
      }
      return res.json({ success: false, message: `GitHub API returned ${ghRes.status}`, latency });

    } catch (err: any) {
      return res.json({ success: false, message: `Error: ${err.message}` });
    }
  });

  // Test GitLab connection
  router.post('/api/test-gitlab', async (_req, res) => {
    try {
      const gitlabToken   = await config.get('gitlab.token');
      const gitlabProject = await config.get('gitlab.project');
      const gitlabUrl     = await config.get('gitlab.url') || 'https://gitlab.com';

      if (!gitlabProject) {
        return res.json({ success: false, message: 'GitLab project path must be set (e.g. myorg/myrepo)' });
      }

      const encoded = encodeURIComponent(gitlabProject);
      const apiUrl  = `${gitlabUrl}/api/v4/projects/${encoded}`;
      const headers: Record<string, string> = { 'User-Agent': 'OpenQA/3.0' };
      if (gitlabToken) headers['PRIVATE-TOKEN'] = gitlabToken;

      const t0 = Date.now();
      let glRes: Awaited<ReturnType<typeof fetch>>;
      try {
        glRes = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(8000) });
      } catch (_err: unknown) {
        return res.json({ success: false, message: 'Network error — GitLab unreachable', latency: Date.now() - t0 });
      }
      const latency = Date.now() - t0;

      if (glRes.ok) {
        const data = await glRes.json().catch(() => ({})) as Record<string, unknown>;
        const visibility = (data.visibility as string) || 'unknown';
        return res.json({
          success: true,
          message: `${gitlabProject} found (${visibility})`,
          latency,
          authenticated: !!gitlabToken,
        });
      }
      if (glRes.status === 401) return res.json({ success: false, message: 'Invalid or expired GitLab token', latency });
      if (glRes.status === 403) return res.json({ success: false, message: 'Access forbidden — check token permissions', latency });
      if (glRes.status === 404) {
        return res.json({
          success: false,
          message: gitlabToken
            ? `Project ${gitlabProject} not found or token has no access`
            : `Project ${gitlabProject} not found (or private — add a token)`,
          latency,
        });
      }
      return res.json({ success: false, message: `GitLab API returned ${glRes.status}`, latency });
    } catch (err: any) {
      return res.json({ success: false, message: `Error: ${err.message}` });
    }
  });

  // Test LLM provider — verify the API key is valid with a minimal call
  router.post('/api/test-llm', async (req, res) => {
    const { provider, apiKey, baseUrl } =
      req.body as { provider?: string; apiKey?: string; baseUrl?: string };

    if (!provider) {
      return res.status(400).json({ success: false, message: 'provider is required' });
    }

    const start = Date.now();

    try {
      let result: { success: boolean; message: string };

      switch (provider) {
        case 'openai': {
          if (!apiKey) {
            result = { success: false, message: 'No API key provided' };
            break;
          }
          const r = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(8000),
          });
          result = r.ok
            ? { success: true, message: `OpenAI key valid — HTTP ${r.status}` }
            : { success: false, message: r.status === 401 ? 'Invalid API key (401)' : `OpenAI returned HTTP ${r.status}` };
          break;
        }

        case 'anthropic': {
          if (!apiKey) {
            result = { success: false, message: 'No API key provided' };
            break;
          }
          // Send a minimal message — 400 (bad request) still means the key is auth'd
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
            signal: AbortSignal.timeout(10000),
          });
          // 200 or 400 (bad request) → key is accepted; 401 → invalid key
          result = (r.status === 200 || r.status === 400)
            ? { success: true, message: `Anthropic key valid — HTTP ${r.status}` }
            : { success: false, message: r.status === 401 ? 'Invalid API key (401)' : `Anthropic returned HTTP ${r.status}` };
          break;
        }

        case 'ollama': {
          const url = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
          const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
          if (r.ok) {
            const data = await r.json() as { models?: unknown[] };
            const count = data.models?.length ?? 0;
            result = { success: true, message: `Ollama reachable — ${count} model(s) available` };
          } else {
            result = { success: false, message: `Ollama returned HTTP ${r.status}` };
          }
          break;
        }

        default:
          result = { success: false, message: `Unknown provider: ${provider}` };
      }

      res.json({ ...result, latency: Date.now() - start, provider });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const isTimeout = raw.includes('abort') || raw.includes('timeout') || raw.includes('TimeoutError');
      res.json({
        success: false,
        message: isTimeout ? `Timeout — ${provider} unreachable` : `Error — ${raw}`,
        latency: Date.now() - start,
        provider,
      });
    }
  });

  // OpenAPI
  router.get('/api/openapi.json', (_req, res) => {
    res.json(getOpenAPISpec());
  });

  router.get('/api/docs', (_req, res) => {
    const spec = JSON.stringify(getOpenAPISpec());
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OpenQA API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ spec: ${spec}, dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });
  </script>
</body>
</html>`);
  });

  // ==================== Coverage API ====================
  // IMPORTANT: specific routes must be declared BEFORE the dynamic /:sessionId route,
  // otherwise Express matches /api/coverage/stats with sessionId="stats".

  router.get('/api/coverage', async (_req, res) => {
    try {
      const coverage = await db.getAggregatedCoverage();
      res.json(coverage);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/api/coverage/stats', async (_req, res) => {
    try {
      const stats = await db.getCoverageStats();
      res.json(stats);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/api/coverage/track', async (req, res) => {
    try {
      const { sessionId, url, actionType } = req.body as { sessionId: string; url: string; actionType?: 'visit' | 'action' | 'form' | 'api' };
      if (!sessionId || !url) {
        return res.status(400).json({ error: 'sessionId and url are required' });
      }
      const entry = await db.trackPageVisit(sessionId, url, actionType || 'visit');
      res.json(entry);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.delete('/api/coverage', async (_req, res) => {
    try {
      await db.clearCoverage();
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Dynamic coverage per session — must come AFTER the specific routes above
  router.get('/api/coverage/:sessionId', async (req, res) => {
    try {
      const { CoverageTracker } = await import('../agent/coverage/index.js');
      const tracker = new CoverageTracker();
      await tracker.loadFromDatabase(db, req.params.sessionId);
      res.json(tracker.getReport());
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Cleanup & storage stats
  router.post('/api/cleanup', async (req, res) => {
    try {
      const maxAgeDays = parseInt(req.query.maxAgeDays as string) || 30;
      const result = await db.pruneOldSessions(maxAgeDays);
      res.json({ success: true, ...result });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/api/storage', async (_req, res) => {
    try {
      const stats = await db.getStorageStats();
      res.json(stats);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Export
  router.get('/api/export/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const fmtResult = exportFormatSchema.safeParse(req.query.format || 'json');
      if (!fmtResult.success) {
        return res.status(400).json({ error: 'Invalid format. Use json, csv, or html.' });
      }
      const format = fmtResult.data as ExportFormat;

      const exportService = new ExportService(db);
      const result = await exportService.exportSession(sessionId, format);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (error: unknown) {
      res.status(404).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Tasks & Issues (mock data)
  router.get('/api/tasks', async (_req, res) => {
    try {
      const tasks = await db.getCurrentTasks();
      res.json(tasks);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/api/issues', async (_req, res) => {
    try {
      const issues = await db.getCurrentIssues();
      res.json(issues);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Reports
  const reportGenerator = new ReportGenerator(db);

  router.get('/api/reports/:sessionId', async (req, res) => {
    try {
      const report = await reportGenerator.generateReport(req.params.sessionId);
      res.json(report);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/api/reports/:sessionId/download/html', async (req, res) => {
    try {
      const report = await reportGenerator.generateReport(req.params.sessionId);
      const filepath = await reportGenerator.exportHTML(report);
      res.download(filepath, `openqa-report-${req.params.sessionId}.html`);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/api/reports/:sessionId/download/json', async (req, res) => {
    try {
      const report = await reportGenerator.generateReport(req.params.sessionId);
      const filepath = await reportGenerator.exportJSON(report);
      res.download(filepath, `openqa-report-${req.params.sessionId}.json`);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── Approvals (proposed findings pending human review) ──────────────────────

  router.get('/api/approvals', async (req, res) => {
    try {
      const status = (req.query.status as string) || 'pending';
      const findings = db.getProposedFindings(status as 'pending' | 'approved' | 'rejected');
      res.json(findings);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/api/approvals/:id/approve', async (req, res) => {
    try {
      const { note } = req.body as { note?: string };
      const finding = db.getProposedFinding(req.params.id);
      if (!finding) return res.status(404).json({ error: 'Finding not found' });

      db.reviewProposedFinding(req.params.id, 'approved', note);

      // Auto-create kanban ticket on approval
      await db.createKanbanTicket({
        title: finding.title,
        description: finding.description,
        priority: finding.severity,
        column: 'backlog',
        tags: JSON.stringify(['automated-qa', 'approved', finding.category]),
        screenshot_url: finding.evidence,
      });

      res.json({ success: true, message: 'Finding approved and kanban ticket created.' });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/api/approvals/:id/reject', async (req, res) => {
    try {
      const { note } = req.body as { note?: string };
      const finding = db.getProposedFinding(req.params.id);
      if (!finding) return res.status(404).json({ error: 'Finding not found' });

      db.reviewProposedFinding(req.params.id, 'rejected', note);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── Schedules ────────────────────────────────────────────────────────────────

  const scheduleCreateSchema = z.object({
    name: z.string().min(1).max(200),
    cron_expression: z.string().min(1).max(100),
    target_url: z.string().min(1).max(2000),
    enabled: z.boolean().optional().default(true),
  });

  const scheduleUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    cron_expression: z.string().min(1).max(100).optional(),
    target_url: z.string().min(1).max(2000).optional(),
    enabled: z.boolean().optional(),
  });

  router.get('/api/schedules', async (_req, res) => {
    try {
      const schedules = db.getSchedules();
      res.json(schedules);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/api/schedules', validate(scheduleCreateSchema), async (req, res) => {
    try {
      const { name, cron_expression, target_url, enabled } = req.body;
      const schedule = db.createSchedule({ name, cron_expression, target_url, enabled: enabled ? 1 : 0 });
      res.status(201).json(schedule);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.put('/api/schedules/:id', validate(scheduleUpdateSchema), async (req, res) => {
    try {
      const updates: Record<string, unknown> = { ...req.body };
      if ('enabled' in updates) updates.enabled = updates.enabled ? 1 : 0;
      db.updateSchedule(req.params.id, updates as Parameters<typeof db.updateSchedule>[1]);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.delete('/api/schedules/:id', async (req, res) => {
    try {
      db.deleteSchedule(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── Projects ─────────────────────────────────────────────────────────────────

  const projectCreateSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    url: z.string().max(2000).optional(),
    github_owner: z.string().max(100).optional(),
    github_repo: z.string().max(100).optional(),
  });

  router.get('/api/projects', async (_req, res) => {
    try {
      const projects = db.getProjects();
      res.json(projects);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/api/projects', validate(projectCreateSchema), async (req, res) => {
    try {
      const project = db.createProject(req.body);
      res.status(201).json(project);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.delete('/api/projects/:id', async (req, res) => {
    try {
      db.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── Session baseline ─────────────────────────────────────────────────────────

  router.get('/api/sessions/:id/baseline', async (req, res) => {
    try {
      const baseline = db.getBaseline(req.params.id);
      if (!baseline) return res.status(404).json({ error: 'No baseline found for this session' });
      res.json(baseline);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── Executive report ─────────────────────────────────────────────────────────

  router.get('/api/reports/:sessionId/executive', async (req, res) => {
    try {
      const filepath = await reportGenerator.generateExecutiveReport(req.params.sessionId);
      res.download(filepath, `openqa-executive-${req.params.sessionId}.html`);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── GitHub Actions webhook ────────────────────────────────────────────────────
  // Expects X-Hub-Signature-256 HMAC header signed with WEBHOOK_SECRET env var.
  // Triggers an autonomous run on push/pull_request events.

  router.post('/api/webhook/github', async (req, res) => {
    try {
      const secret = process.env.WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers['x-hub-signature-256'] as string | undefined;
        if (!sig) return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });

        const raw = JSON.stringify(req.body);
        const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
        const sigBuf = Buffer.from(sig);
        const expBuf = Buffer.from(expected);

        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const event = req.headers['x-github-event'] as string;
      const payload = req.body as { repository?: { full_name?: string }; ref?: string };

      // Only act on push to default branch or pull_request events
      if (event !== 'push' && event !== 'pull_request') {
        return res.json({ ignored: true, reason: `event ${event} not handled` });
      }

      const repoName = payload.repository?.full_name || 'unknown';
      const cfg = await config.getAll();
      const saasUrl = cfg.saas?.url as string | undefined;

      if (!saasUrl) {
        return res.status(400).json({ error: 'No SaaS URL configured — set saas.url in /config' });
      }

      // Fire an autonomous run asynchronously — do not await
      const { OpenQAAgentV2 } = await import('../agent/index-v2.js');
      const webhookAgent = new OpenQAAgentV2();
      await webhookAgent.configureSaaS({
        name: `Webhook run — ${repoName} (${event})`,
        description: `Triggered by GitHub ${event} on ${repoName}`,
        url: saasUrl,
        auth: { type: 'none', credentials: { username: '', password: '' } },
      });
      webhookAgent.runAutonomous(10).catch(() => { /* background — ignore */ });

      res.json({ success: true, triggered: true, event, repo: repoName });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
}
