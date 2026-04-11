export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...context,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) process.stdout.write(format('debug', message, context) + '\n');
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) process.stdout.write(format('info', message, context) + '\n');
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) process.stderr.write(format('warn', message, context) + '\n');
  },
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog('error')) process.stderr.write(format('error', message, context) + '\n');
  },
  child(defaults: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) => logger.debug(msg, { ...defaults, ...ctx }),
      info:  (msg: string, ctx?: Record<string, unknown>) => logger.info(msg,  { ...defaults, ...ctx }),
      warn:  (msg: string, ctx?: Record<string, unknown>) => logger.warn(msg,  { ...defaults, ...ctx }),
      error: (msg: string, ctx?: Record<string, unknown>) => logger.error(msg, { ...defaults, ...ctx }),
    };
  },
};
