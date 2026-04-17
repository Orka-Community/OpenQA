/**
 * FindingDeduplicator
 *
 * Prevents the same bug from being reported multiple times across specialists.
 * Uses a SHA-256 fingerprint of: normalize(title) + "|" + normalize(url) + "|" + category
 *
 * A finding with fingerprint already in DB → duplicate, skip.
 * Occurrence count is incremented so we know how many times it was seen.
 */

import { createHash } from 'crypto';
import type { OpenQADatabase } from '../../database/index.js';

export class FindingDeduplicator {
  constructor(private db: OpenQADatabase) {}

  /** Compute a stable fingerprint for a finding. */
  fingerprint(title: string, url: string, category: string): string {
    const normalized = [
      title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(),
      (url || '').replace(/[?#].*$/, '').toLowerCase(), // strip query params
      category.toLowerCase(),
    ].join('|');
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /** Returns true if this finding has already been reported. */
  isDuplicate(title: string, url: string, category: string): boolean {
    const fp = this.fingerprint(title, url, category);
    return this.db.hasFingerprint(fp);
  }

  /** Register a finding. Call after creating the bug/ticket. */
  register(title: string, url: string, category: string, findingId?: string): string {
    const fp = this.fingerprint(title, url, category);
    this.db.addFingerprint(fp, title, findingId);
    return fp;
  }

  /** Check and register in one call. Returns {isDuplicate, fingerprint}. */
  checkAndRegister(
    title: string,
    url: string,
    category: string,
    findingId?: string
  ): { isDuplicate: boolean; fingerprint: string } {
    const fp = this.fingerprint(title, url, category);
    const isDuplicate = this.db.hasFingerprint(fp);
    if (!isDuplicate) {
      this.db.addFingerprint(fp, title, findingId);
    }
    return { isDuplicate, fingerprint: fp };
  }
}
