import { OpenAIAdapter } from '@orka-js/openai';
import { AnthropicAdapter } from '@orka-js/anthropic';
import type { LLMAdapter } from '@orka-js/core';
import { EventEmitter } from 'events';
import { BrainError } from '../errors.js';
import { LLMCache } from './llm-cache.js';
import { metrics } from '../metrics.js';

interface ResilientLLMConfig {
  provider: string;
  apiKey: string;
  model?: string;
  fallbackProvider?: string;
  fallbackApiKey?: string;
  fallbackModel?: string;
  maxRetries?: number;
  circuitThreshold?: number;
  circuitResetMs?: number;
  cacheTtlMs?: number;
  cacheMaxSize?: number;
}

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

export class ResilientLLM extends EventEmitter {
  private config: ResilientLLMConfig;
  private circuit: CircuitState = { failures: 0, lastFailure: 0, isOpen: false };
  private maxRetries: number;
  private circuitThreshold: number;
  private circuitResetMs: number;
  private cache: LLMCache;

  constructor(config: ResilientLLMConfig) {
    super();
    this.config = config;
    this.maxRetries = config.maxRetries ?? 3;
    this.circuitThreshold = config.circuitThreshold ?? 5;
    this.circuitResetMs = config.circuitResetMs ?? 30000;
    this.cache = new LLMCache({
      ttlMs: config.cacheTtlMs,
      maxSize: config.cacheMaxSize,
    });
  }

  private createAdapter(provider: string, apiKey: string, model?: string): LLMAdapter {
    if (provider === 'anthropic') {
      return new AnthropicAdapter({
        apiKey,
        model: model || 'claude-3-5-sonnet-20241022',
      });
    }
    return new OpenAIAdapter({
      apiKey,
      model: model || 'gpt-4',
    });
  }

  private isCircuitOpen(): boolean {
    if (!this.circuit.isOpen) return false;
    // Check if enough time has passed to half-open
    if (Date.now() - this.circuit.lastFailure >= this.circuitResetMs) {
      this.circuit.isOpen = false;
      this.emit('llm-circuit-half-open', { provider: this.config.provider });
      return false;
    }
    return true;
  }

  private recordFailure() {
    this.circuit.failures++;
    this.circuit.lastFailure = Date.now();
    if (this.circuit.failures >= this.circuitThreshold) {
      this.circuit.isOpen = true;
      metrics.inc('llm_circuit_opens');
      this.emit('llm-circuit-open', {
        provider: this.config.provider,
        failures: this.circuit.failures,
      });
    }
  }

  private recordSuccess() {
    this.circuit.failures = 0;
    this.circuit.isOpen = false;
  }

  /** Generate text, returning the string content */
  async generate(prompt: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(prompt);
    if (cached !== null) {
      metrics.inc('llm_cache_hits');
      this.emit('llm-cache-hit', { promptLength: prompt.length });
      return cached;
    }

    metrics.inc('llm_calls');

    // Try primary provider (unless circuit is open)
    if (!this.isCircuitOpen()) {
      try {
        return await this.generateWithRetry(
          this.config.provider,
          this.config.apiKey,
          this.config.model,
          prompt,
        );
      } catch (e) {
        this.recordFailure();
        this.emit('llm-primary-failed', {
          provider: this.config.provider,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Try fallback provider
    if (this.config.fallbackProvider && this.config.fallbackApiKey) {
      try {
        metrics.inc('llm_fallbacks');
        this.emit('llm-fallback', {
          from: this.config.provider,
          to: this.config.fallbackProvider,
        });
        const result = await this.generateWithRetry(
          this.config.fallbackProvider,
          this.config.fallbackApiKey,
          this.config.fallbackModel,
          prompt,
        );
        this.cache.set(prompt, result);
        return result;
      } catch (e) {
        throw new BrainError(
          `Both LLM providers failed. Primary: ${this.config.provider}, Fallback: ${this.config.fallbackProvider}`,
        );
      }
    }

    throw new BrainError(
      `LLM provider ${this.config.provider} failed and no fallback is configured`,
    );
  }

  private async generateWithRetry(
    provider: string,
    apiKey: string,
    model: string | undefined,
    prompt: string,
  ): Promise<string> {
    const adapter = this.createAdapter(provider, apiKey, model);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await adapter.generate(prompt);
        const text = result.content;
        this.recordSuccess();
        this.cache.set(prompt, text);
        return text;
      } catch (e) {
        lastError = e;
        if (attempt < this.maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          metrics.inc('llm_retries');
          this.emit('llm-retry', {
            provider,
            attempt,
            maxRetries: this.maxRetries,
            delayMs,
            error: e instanceof Error ? e.message : String(e),
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }

  getCircuitState(): { isOpen: boolean; failures: number } {
    return {
      isOpen: this.isCircuitOpen(),
      failures: this.circuit.failures,
    };
  }

  getCacheStats() {
    return this.cache.stats();
  }

  clearCache() {
    this.cache.clear();
  }
}
