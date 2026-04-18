import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'cli/index': 'cli/index.ts',
      'cli/server': 'cli/server.ts',
      'cli/daemon': 'cli/daemon.ts',
      'cli/dashboard.html': 'cli/dashboard.html.ts',
      'cli/config.html': 'cli/config.html.ts',
      'cli/kanban.html': 'cli/kanban.html.ts',
      'cli/env.html': 'cli/env.html.ts',
      'cli/sessions.html': 'cli/sessions.html.ts',
      'cli/issues.html': 'cli/issues.html.ts',
      'cli/tests.html': 'cli/tests.html.ts',
      'cli/coverage.html': 'cli/coverage.html.ts',
      'cli/approvals.html': 'cli/approvals.html.ts',
      'cli/schedules.html': 'cli/schedules.html.ts',
      'cli/logs.html': 'cli/logs.html.ts',
      'cli/session-detail.html': 'cli/session-detail.html.ts',
      'cli/env-routes': 'cli/env-routes.ts',
      'cli/env-config': 'cli/env-config.ts',
      'cli/components/sidebar': 'cli/components/sidebar.ts',
      'cli/components/styles': 'cli/components/styles.ts'
    },
    format: ['esm'],
    dts: false,
    sourcemap: false,
    clean: true,
    splitting: false,
    shims: true,
    external: ['sqlite3', 'better-sqlite3']
  },
  {
    entry: {
      'agent/index': 'agent/index.ts',
      'agent/index-v2': 'agent/index-v2.ts',
      'agent/logger': 'agent/logger.ts',
      'agent/metrics': 'agent/metrics.ts',
      'agent/brain/llm-resilience': 'agent/brain/llm-resilience.ts',
      'agent/brain/llm-cache': 'agent/brain/llm-cache.ts',
      'agent/brain/diff-analyzer': 'agent/brain/diff-analyzer.ts',
      'agent/tools/project-runner': 'agent/tools/project-runner.ts',
      'agent/export/index': 'agent/export/index.ts',
      'agent/coverage/index': 'agent/coverage/index.ts',
      'agent/tools/gitlab': 'agent/tools/gitlab.ts',
      'agent/notifications/index': 'agent/notifications/index.ts',
      'agent/openapi/spec': 'agent/openapi/spec.ts',
      'agent/config/index': 'agent/config/index.ts',
      'database/index': 'database/index.ts',
      'database/sqlite': 'database/sqlite.ts',
      'cli/routes': 'cli/routes.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    splitting: false,
    shims: true,
    external: ['sqlite3', 'better-sqlite3']
  }
]);
