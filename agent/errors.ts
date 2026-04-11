// ─── Custom Error Classes for OpenQA ───

export class OpenQAError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'OpenQAError';
    this.code = code;
  }
}

export class BrowserError extends OpenQAError {
  constructor(message: string, code = 'BROWSER_ERROR') {
    super(message, code);
    this.name = 'BrowserError';
  }
}

export class ConfigError extends OpenQAError {
  constructor(message: string, code = 'CONFIG_ERROR') {
    super(message, code);
    this.name = 'ConfigError';
  }
}

export class DatabaseError extends OpenQAError {
  constructor(message: string, code = 'DATABASE_ERROR') {
    super(message, code);
    this.name = 'DatabaseError';
  }
}

export class GitError extends OpenQAError {
  constructor(message: string, code = 'GIT_ERROR') {
    super(message, code);
    this.name = 'GitError';
  }
}

export class BrainError extends OpenQAError {
  constructor(message: string, code = 'BRAIN_ERROR') {
    super(message, code);
    this.name = 'BrainError';
  }
}

export class ProjectRunnerError extends OpenQAError {
  constructor(message: string, code = 'PROJECT_RUNNER_ERROR') {
    super(message, code);
    this.name = 'ProjectRunnerError';
  }
}

export function isOpenQAError(e: unknown): e is OpenQAError {
  return e instanceof OpenQAError;
}

export function toSafeMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unknown error';
}
