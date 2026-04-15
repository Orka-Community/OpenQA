import { describe, it, expect, beforeEach } from 'vitest';

// metrics is a module-level singleton — reset counters between tests by
// re-importing after vi.resetModules() so each suite starts from zero.
// Because vitest caches modules across tests in the same file, we import once
// and simply verify cumulative behaviour within a single describe block.

describe('metrics', () => {
  // We import once and accept cumulative state within this file.
  // Individual tests are written to be order-independent by reading delta values.

  it('snapshot() returns the expected shape', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const snap = metrics.snapshot();

    expect(snap).toHaveProperty('uptimeSeconds');
    expect(snap).toHaveProperty('memory');
    expect(snap).toHaveProperty('counters');
    expect(snap).toHaveProperty('cacheHitRate');

    expect(typeof snap.uptimeSeconds).toBe('number');
    expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);

    expect(typeof snap.memory.heapUsedMB).toBe('number');
    expect(typeof snap.memory.heapTotalMB).toBe('number');
    expect(typeof snap.memory.rssMB).toBe('number');
  });

  it('inc() increments a known counter', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const before = metrics.snapshot().counters.llm_calls;
    metrics.inc('llm_calls');
    expect(metrics.snapshot().counters.llm_calls).toBe(before + 1);
  });

  it('inc() accepts a custom amount', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const before = metrics.snapshot().counters.tests_generated;
    metrics.inc('tests_generated', 5);
    expect(metrics.snapshot().counters.tests_generated).toBe(before + 5);
  });

  it('inc() silently ignores unknown keys', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const snapBefore = metrics.snapshot().counters;
    // @ts-expect-error — intentionally invalid key
    metrics.inc('totally_unknown_counter');
    const snapAfter = metrics.snapshot().counters;
    expect(snapBefore).toEqual(snapAfter);
  });

  it('cacheHitRate is 0 when no LLM calls have happened', async () => {
    // Reset modules to get a fresh singleton at 0 counts
    const { vi } = await import('vitest');
    vi.resetModules();
    const { metrics } = await import('../../agent/metrics.js');
    // The freshly loaded module starts with all counters at 0
    expect(metrics.snapshot().cacheHitRate).toBe(0);
  });

  it('cacheHitRate reflects cache hits vs total calls', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const { metrics } = await import('../../agent/metrics.js');

    metrics.inc('llm_calls', 3);      // 3 calls that missed cache
    metrics.inc('llm_cache_hits', 1); // 1 hit
    // cacheHitRate = hits / (calls + hits) * 100 = 1/4 * 100 = 25
    expect(metrics.snapshot().cacheHitRate).toBe(25);
  });

  it('bugs_found counter starts at 0 in a fresh module', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const { metrics } = await import('../../agent/metrics.js');
    expect(metrics.snapshot().counters.bugs_found).toBe(0);
  });

  it('all expected counter keys are present', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const snap = metrics.snapshot();
    const keys = [
      'llm_calls', 'llm_cache_hits', 'llm_retries', 'llm_fallbacks',
      'llm_circuit_opens', 'tests_generated', 'tests_run', 'tests_passed',
      'tests_failed', 'bugs_found', 'sessions_started', 'ws_connections',
      'http_requests',
    ];
    for (const k of keys) {
      expect(snap.counters).toHaveProperty(k);
      expect(typeof (snap.counters as Record<string, number>)[k]).toBe('number');
    }
  });

  it('sessions_started increments correctly', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const before = metrics.snapshot().counters.sessions_started;
    metrics.inc('sessions_started');
    metrics.inc('sessions_started');
    expect(metrics.snapshot().counters.sessions_started).toBe(before + 2);
  });

  it('memory values are non-negative', async () => {
    const { metrics } = await import('../../agent/metrics.js');
    const { memory } = metrics.snapshot();
    expect(memory.heapUsedMB).toBeGreaterThanOrEqual(0);
    expect(memory.heapTotalMB).toBeGreaterThanOrEqual(0);
    expect(memory.rssMB).toBeGreaterThanOrEqual(0);
  });
});
