const startedAt = Date.now();

const counters: Record<string, number> = {
  llm_calls: 0,
  llm_cache_hits: 0,
  llm_retries: 0,
  llm_fallbacks: 0,
  llm_circuit_opens: 0,
  tests_generated: 0,
  tests_run: 0,
  tests_passed: 0,
  tests_failed: 0,
  bugs_found: 0,
  sessions_started: 0,
  ws_connections: 0,
  http_requests: 0,
};

export const metrics = {
  inc(key: keyof typeof counters, by = 1) {
    if (key in counters) counters[key] += by;
  },

  snapshot() {
    const memMB = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      memory: {
        heapUsedMB: Math.round(memMB.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memMB.heapTotal / 1024 / 1024),
        rssMB: Math.round(memMB.rss / 1024 / 1024),
      },
      counters: { ...counters },
      cacheHitRate: counters.llm_calls > 0
        ? Math.round((counters.llm_cache_hits / (counters.llm_calls + counters.llm_cache_hits)) * 100)
        : 0,
    };
  },
};
