import { createHash } from 'crypto';

interface CacheEntry {
  response: string;
  expiresAt: number;
}

export class LLMCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;
  private maxSize: number;

  constructor(options?: { ttlMs?: number; maxSize?: number }) {
    this.ttlMs = options?.ttlMs ?? 3600000; // 1 hour
    this.maxSize = options?.maxSize ?? 500;
  }

  private key(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex');
  }

  get(prompt: string): string | null {
    const k = this.key(prompt);
    const entry = this.store.get(k);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(k);
      return null;
    }
    return entry.response;
  }

  set(prompt: string, response: string): void {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(this.key(prompt), {
      response,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  stats(): { size: number; ttlMs: number; maxSize: number } {
    return { size: this.store.size, ttlMs: this.ttlMs, maxSize: this.maxSize };
  }
}
