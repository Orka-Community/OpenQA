import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'cli/index': 'cli/index.ts',
      'cli/server': 'cli/server.ts',
      'cli/daemon': 'cli/daemon.ts',
      'cli/dashboard.html': 'cli/dashboard.html.ts',
      'cli/config.html': 'cli/config.html.ts',
      'cli/kanban.html': 'cli/kanban.html.ts'
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
