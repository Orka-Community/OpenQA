import { describe, it, expect, vi } from 'vitest';
import { LLMCache } from '../../../agent/brain/llm-cache.js';

describe('LLMCache', () => {
  it('should return null for a cache miss', () => {
    const cache = new LLMCache();
    expect(cache.get('unknown prompt')).toBeNull();
  });

  it('should return cached response on hit', () => {
    const cache = new LLMCache();
    cache.set('hello', 'world');
    expect(cache.get('hello')).toBe('world');
  });

  it('should expire entries after TTL', async () => {
    const cache = new LLMCache({ ttlMs: 10 });
    cache.set('prompt', 'response');
    await new Promise(r => setTimeout(r, 20));
    expect(cache.get('prompt')).toBeNull();
  });

  it('should evict oldest entry when maxSize exceeded', () => {
    const cache = new LLMCache({ maxSize: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3'); // should evict 'a'
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('should clear all entries', () => {
    const cache = new LLMCache();
    cache.set('x', 'y');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should report stats', () => {
    const cache = new LLMCache({ ttlMs: 5000, maxSize: 100 });
    cache.set('a', '1');
    const stats = cache.stats();
    expect(stats.size).toBe(1);
    expect(stats.ttlMs).toBe(5000);
    expect(stats.maxSize).toBe(100);
  });

  it('should produce different keys for different prompts', () => {
    const cache = new LLMCache();
    cache.set('prompt A', 'response A');
    cache.set('prompt B', 'response B');
    expect(cache.get('prompt A')).toBe('response A');
    expect(cache.get('prompt B')).toBe('response B');
  });
});
