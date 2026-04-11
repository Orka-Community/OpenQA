import { describe, it, expect } from 'vitest';
import {
  OpenQAError,
  BrowserError,
  ConfigError,
  DatabaseError,
  GitError,
  BrainError,
  isOpenQAError,
  toSafeMessage,
} from '../../agent/errors.js';

describe('Custom Error Classes', () => {
  it('should create OpenQAError with code', () => {
    const err = new OpenQAError('test', 'TEST_CODE');
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('OpenQAError');
    expect(err instanceof Error).toBe(true);
  });

  it('should create domain errors with default codes', () => {
    expect(new BrowserError('x').code).toBe('BROWSER_ERROR');
    expect(new ConfigError('x').code).toBe('CONFIG_ERROR');
    expect(new DatabaseError('x').code).toBe('DATABASE_ERROR');
    expect(new GitError('x').code).toBe('GIT_ERROR');
    expect(new BrainError('x').code).toBe('BRAIN_ERROR');
  });

  it('should allow custom codes on subclasses', () => {
    const err = new BrowserError('nav failed', 'BROWSER_NAV_FAILED');
    expect(err.code).toBe('BROWSER_NAV_FAILED');
    expect(err.name).toBe('BrowserError');
  });

  it('isOpenQAError should detect OpenQA errors', () => {
    expect(isOpenQAError(new OpenQAError('x', 'X'))).toBe(true);
    expect(isOpenQAError(new BrowserError('x'))).toBe(true);
    expect(isOpenQAError(new Error('x'))).toBe(false);
    expect(isOpenQAError('string')).toBe(false);
    expect(isOpenQAError(null)).toBe(false);
  });

  it('toSafeMessage should extract message safely', () => {
    expect(toSafeMessage(new Error('hello'))).toBe('hello');
    expect(toSafeMessage(new BrowserError('browser fail'))).toBe('browser fail');
    expect(toSafeMessage('string error')).toBe('string error');
    expect(toSafeMessage(42)).toBe('Unknown error');
    expect(toSafeMessage(null)).toBe('Unknown error');
    expect(toSafeMessage(undefined)).toBe('Unknown error');
  });
});
