export function getOpenAPISpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'OpenQA API',
      description: 'Autonomous QA testing agent — REST API',
      version: '1.3.4',
      contact: { url: 'https://openqa.orkajs.com' },
      license: { name: 'MIT' },
    },
    servers: [{ url: '/api', description: 'OpenQA server' }],
    tags: [
      { name: 'health', description: 'Health & status' },
      { name: 'sessions', description: 'Test sessions' },
      { name: 'bugs', description: 'Bug reports' },
      { name: 'kanban', description: 'Kanban board' },
      { name: 'config', description: 'Configuration' },
      { name: 'agent', description: 'Agent control' },
      { name: 'project', description: 'Project runner' },
      { name: 'export', description: 'Result export' },
      { name: 'coverage', description: 'Test coverage' },
      { name: 'storage', description: 'Storage management' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
            },
          },
        },
      },
      '/status': {
        get: {
          tags: ['health'],
          summary: 'Agent status',
          responses: {
            '200': {
              description: 'Agent running state',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Status' } } },
            },
          },
        },
      },
      '/sessions': {
        get: {
          tags: ['sessions'],
          summary: 'List recent sessions',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
          responses: {
            '200': {
              description: 'Array of sessions',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Session' } } } },
            },
          },
        },
      },
      '/sessions/{id}/actions': {
        get: {
          tags: ['sessions'],
          summary: 'Get actions for a session',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Array of actions',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Action' } } } },
            },
          },
        },
      },
      '/bugs': {
        get: {
          tags: ['bugs'],
          summary: 'List bugs',
          parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'in-progress', 'resolved', 'closed'] } }],
          responses: {
            '200': {
              description: 'Array of bugs',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bug' } } } },
            },
          },
        },
      },
      '/kanban': {
        get: {
          tags: ['kanban'],
          summary: 'List all kanban tickets',
          responses: {
            '200': {
              description: 'Array of tickets',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/KanbanTicket' } } } },
            },
          },
        },
        post: {
          tags: ['kanban'],
          summary: 'Create a kanban ticket',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/KanbanTicketInput' } } },
          },
          responses: {
            '200': { description: 'Created ticket', content: { 'application/json': { schema: { $ref: '#/components/schemas/KanbanTicket' } } } },
          },
        },
      },
      '/kanban/{id}': {
        put: {
          tags: ['kanban'],
          summary: 'Update a kanban ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KanbanTicketInput' } } } },
          responses: { '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } } },
        },
        delete: {
          tags: ['kanban'],
          summary: 'Delete a kanban ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } } },
        },
      },
      '/config': {
        get: {
          tags: ['config'],
          summary: 'Get current configuration',
          responses: { '200': { description: 'Configuration object' } },
        },
        post: {
          tags: ['config'],
          summary: 'Update configuration',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } } },
        },
      },
      '/agent/start': {
        post: {
          tags: ['agent'],
          summary: 'Start autonomous agent session',
          responses: { '200': { description: 'Started', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } } },
        },
      },
      '/agent/stop': {
        post: {
          tags: ['agent'],
          summary: 'Stop the running agent',
          responses: { '200': { description: 'Stopped', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } } },
        },
      },
      '/project/setup': {
        post: {
          tags: ['project'],
          summary: 'Setup project — detect, install deps, optionally start dev server',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['repoPath'],
                  properties: {
                    repoPath: { type: 'string', description: 'Absolute path to the project' },
                    startServer: { type: 'boolean', description: 'Start dev server after install' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Project status', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectStatus' } } } } },
        },
      },
      '/project/status': {
        get: {
          tags: ['project'],
          summary: 'Get project runner status',
          responses: { '200': { description: 'Status', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectStatus' } } } } },
        },
      },
      '/project/test': {
        post: {
          tags: ['project'],
          summary: 'Run existing project tests',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['repoPath'], properties: { repoPath: { type: 'string' } } } } },
          },
          responses: { '200': { description: 'Test results', content: { 'application/json': { schema: { $ref: '#/components/schemas/TestRunResult' } } } } },
        },
      },
      '/export/{sessionId}': {
        get: {
          tags: ['export'],
          summary: 'Export session results',
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv', 'html'], default: 'json' } },
          ],
          responses: {
            '200': { description: 'File download (json / csv / html)' },
            '404': { description: 'Session not found' },
          },
        },
      },
      '/coverage/{sessionId}': {
        get: {
          tags: ['coverage'],
          summary: 'Get coverage report for a session',
          parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Coverage report', content: { 'application/json': { schema: { $ref: '#/components/schemas/CoverageReport' } } } } },
        },
      },
      '/storage': {
        get: {
          tags: ['storage'],
          summary: 'Get storage statistics',
          responses: { '200': { description: 'Storage stats' } },
        },
      },
      '/cleanup': {
        post: {
          tags: ['storage'],
          summary: 'Prune old sessions',
          parameters: [{ name: 'maxAgeDays', in: 'query', schema: { type: 'integer', default: 30 } }],
          responses: { '200': { description: 'Cleanup result' } },
        },
      },
    },
    components: {
      schemas: {
        Health: {
          type: 'object',
          properties: { status: { type: 'string' }, uptime: { type: 'number' }, version: { type: 'string' } },
        },
        Status: {
          type: 'object',
          properties: { isRunning: { type: 'boolean' }, sessionId: { type: 'string' } },
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string' }, started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['running', 'completed', 'failed'] },
            total_actions: { type: 'integer' }, bugs_found: { type: 'integer' },
          },
        },
        Action: {
          type: 'object',
          properties: {
            id: { type: 'string' }, session_id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            type: { type: 'string' }, description: { type: 'string' },
          },
        },
        Bug: {
          type: 'object',
          properties: {
            id: { type: 'string' }, session_id: { type: 'string' },
            title: { type: 'string' }, description: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            status: { type: 'string', enum: ['open', 'in-progress', 'resolved', 'closed'] },
            github_issue_url: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        KanbanTicket: {
          type: 'object',
          properties: {
            id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            column: { type: 'string', enum: ['backlog', 'to-do', 'in-progress', 'done'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        KanbanTicketInput: {
          type: 'object',
          properties: {
            title: { type: 'string' }, description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            column: { type: 'string', enum: ['backlog', 'to-do', 'in-progress', 'done'] },
          },
        },
        ProjectStatus: {
          type: 'object',
          properties: {
            repoPath: { type: 'string' }, installed: { type: 'boolean' },
            serverRunning: { type: 'boolean' }, serverUrl: { type: 'string', nullable: true },
            serverPid: { type: 'integer', nullable: true },
          },
        },
        TestRunResult: {
          type: 'object',
          properties: {
            runner: { type: 'string' }, passed: { type: 'integer' }, failed: { type: 'integer' },
            skipped: { type: 'integer' }, total: { type: 'integer' }, durationMs: { type: 'integer' },
          },
        },
        CoverageReport: {
          type: 'object',
          properties: {
            total: { type: 'integer' }, tested: { type: 'integer' }, untested: { type: 'integer' },
            coveragePercent: { type: 'integer' },
            entries: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' }, tested: { type: 'boolean' }, testCount: { type: 'integer' } } } },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: { success: { type: 'boolean' } },
        },
      },
    },
  };
}
