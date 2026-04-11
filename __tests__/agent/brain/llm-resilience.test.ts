import { describe, it, expect, vi } from 'vitest';
import { ResilientLLM } from '../../../agent/brain/llm-resilience.js';

// Mock both adapters
vi.mock('@orka-js/openai', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({
    generate: vi.fn(),
  })),
}));

vi.mock('@orka-js/anthropic', () => ({
  AnthropicAdapter: vi.fn().mockImplementation(() => ({
    generate: vi.fn(),
  })),
}));

import { OpenAIAdapter } from '@orka-js/openai';
import { AnthropicAdapter } from '@orka-js/anthropic';

const llmResult = (content: string) => ({ content, usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } });

describe('ResilientLLM', () => {
  it('should return result on first successful call', async () => {
    const mockGenerate = vi.fn().mockResolvedValue(llmResult('hello'));
    vi.mocked(OpenAIAdapter).mockImplementation(() => ({ generate: mockGenerate }) as never);

    const llm = new ResilientLLM({
      provider: 'openai',
      apiKey: 'test-key',
      maxRetries: 3,
    });

    const result = await llm.generate('test prompt');
    expect(result).toBe('hello');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure then succeed', async () => {
    const mockGenerate = vi.fn()
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValueOnce(llmResult('success'));
    vi.mocked(OpenAIAdapter).mockImplementation(() => ({ generate: mockGenerate }) as never);

    const llm = new ResilientLLM({
      provider: 'openai',
      apiKey: 'test-key',
      maxRetries: 3,
    });

    const events: string[] = [];
    llm.on('llm-retry', () => events.push('retry'));

    const result = await llm.generate('test');
    expect(result).toBe('success');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(events).toContain('retry');
  });

  it('should fallback to anthropic when openai fails completely', async () => {
    const mockOpenAI = vi.fn().mockRejectedValue(new Error('dead'));
    const mockAnthropic = vi.fn().mockResolvedValue(llmResult('fallback result'));

    vi.mocked(OpenAIAdapter).mockImplementation(() => ({ generate: mockOpenAI }) as never);
    vi.mocked(AnthropicAdapter).mockImplementation(() => ({ generate: mockAnthropic }) as never);

    const llm = new ResilientLLM({
      provider: 'openai',
      apiKey: 'key1',
      fallbackProvider: 'anthropic',
      fallbackApiKey: 'key2',
      maxRetries: 1,
    });

    const events: string[] = [];
    llm.on('llm-fallback', () => events.push('fallback'));

    const result = await llm.generate('test');
    expect(result).toBe('fallback result');
    expect(events).toContain('fallback');
  });

  it('should open circuit after threshold failures', async () => {
    const mockGenerate = vi.fn().mockRejectedValue(new Error('fail'));
    vi.mocked(OpenAIAdapter).mockImplementation(() => ({ generate: mockGenerate }) as never);

    const llm = new ResilientLLM({
      provider: 'openai',
      apiKey: 'key',
      maxRetries: 1,
      circuitThreshold: 2,
      circuitResetMs: 60000,
    });

    const events: string[] = [];
    llm.on('llm-circuit-open', () => events.push('circuit-open'));

    // First call fails, records 1 failure
    await expect(llm.generate('a')).rejects.toThrow();
    // Second call fails, circuit opens
    await expect(llm.generate('b')).rejects.toThrow();

    expect(events).toContain('circuit-open');
    expect(llm.getCircuitState().isOpen).toBe(true);
  });

  it('should throw BrainError when both providers fail', async () => {
    const mockFail = vi.fn().mockRejectedValue(new Error('fail'));
    vi.mocked(OpenAIAdapter).mockImplementation(() => ({ generate: mockFail }) as never);
    vi.mocked(AnthropicAdapter).mockImplementation(() => ({ generate: mockFail }) as never);

    const llm = new ResilientLLM({
      provider: 'openai',
      apiKey: 'key1',
      fallbackProvider: 'anthropic',
      fallbackApiKey: 'key2',
      maxRetries: 1,
    });

    await expect(llm.generate('test')).rejects.toThrow('Both LLM providers failed');
  });

  it('should report circuit state', () => {
    const llm = new ResilientLLM({
      provider: 'openai',
      apiKey: 'key',
    });

    const state = llm.getCircuitState();
    expect(state.isOpen).toBe(false);
    expect(state.failures).toBe(0);
  });
});
