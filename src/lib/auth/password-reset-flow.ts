export function buildPasswordResetRedirectUrl(origin: string) {
  return `${origin.replace(/\/$/, '')}/auth/reset-password`;
}

export function classifyForgotPasswordError(error: { message?: string; status?: number } | null) {
  if (!error) return null;

  const message = error.message?.toLowerCase() ?? '';
  const isRateLimit = error.status === 429 || message.includes('rate') || message.includes('too many');

  return isRateLimit
    ? 'Too many requests. Please wait a few minutes before trying again.'
    : 'Something went wrong. Please try again.';
}

export function resolveRecoverySessionState(params: {
  exchangeError?: boolean;
  sessionError?: boolean;
  hasSession: boolean;
  authEvent?: string | null;
}) {
  if (params.authEvent === 'PASSWORD_RECOVERY') return 'ready' as const;
  if (params.exchangeError || params.sessionError || !params.hasSession) return 'expired' as const;
  return 'ready' as const;
}

export function classifyPasswordUpdateError(message?: string | null) {
  const normalized = message?.toLowerCase() ?? '';

  if (normalized.includes('weak') || normalized.includes('policy')) return 'weak' as const;
  if (normalized.includes('expired') || normalized.includes('invalid') || normalized.includes('used')) return 'expired' as const;
  return 'generic' as const;
}
