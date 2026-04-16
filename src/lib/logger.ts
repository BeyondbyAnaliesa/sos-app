/**
 * Structured error logger.
 * Logs to console with structured JSON. Swap to Sentry, Datadog, etc. later.
 */

interface ErrorContext {
  route?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

export function logError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = {
    _level: 'error',
    _ts: new Date().toISOString(),
    message,
    ...(stack ? { stack: stack.split('\n').slice(0, 5).join('\n') } : {}),
    ...context,
  };

  console.error(JSON.stringify(payload));

  // --- Production provider goes here ---
  // Sentry.captureException(error, { extra: context });
}

export function logWarn(message: string, context?: ErrorContext): void {
  console.warn(JSON.stringify({ _level: 'warn', _ts: new Date().toISOString(), message, ...context }));
}
