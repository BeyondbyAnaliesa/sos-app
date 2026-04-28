/**
 * env-check.ts
 *
 * Startup environment validation for SOS-App backend configuration.
 *
 * Use `checkRequiredEnvVars()` to audit which critical env vars are
 * set/missing — returns boolean presence, never exposes values.
 *
 * Use `warnIfCronSecretMissing(routeName)` at the top of any operator route
 * handler (before the auth check) so a missing CRON_SECRET surfaces
 * immediately in Vercel logs on cold start rather than silently rejecting
 * every request with an opaque 401.
 */

import { logWarn } from '@/lib/logger';

/**
 * Critical environment variables required for production operation.
 * Each entry documents which subsystem breaks when the var is absent.
 */
const REQUIRED_ENV_VARS = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL',      group: 'supabase',   description: 'Supabase project URL — all DB access broken without this' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', group: 'supabase',   description: 'Supabase anon key — client-side auth broken without this' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',     group: 'supabase',   description: 'Supabase service-role key — all server-side admin DB calls broken without this' },
  { key: 'OPENAI_API_KEY',               group: 'openai',     description: 'OpenAI API key — journal chat, signal extraction broken without this' },
  { key: 'CRON_SECRET',                  group: 'cron_auth',  description: 'Cron/operator secret — all Bearer token auth for operator endpoints broken without this' },
  { key: 'STRIPE_SECRET_KEY',            group: 'stripe',     description: 'Stripe secret key — subscription management broken without this' },
  { key: 'STRIPE_WEBHOOK_SECRET',        group: 'stripe',     description: 'Stripe webhook secret — payment event handling broken without this' },
] as const;

export interface EnvCheckResult {
  /** True when all required vars are present and non-empty. */
  ok: boolean;
  /** Names of missing or empty vars. */
  missing: string[];
  /** Names of present and non-empty vars. */
  present: string[];
  /**
   * Boolean presence map — safe to expose to operators.
   * Never exposes the actual env values.
   */
  status: Record<string, boolean>;
}

/**
 * Check which critical env vars are set and non-empty.
 * Returns presence booleans only — never exposes values.
 *
 * Safe to include in operator API responses (e.g. /api/astrology/memory-status).
 */
export function checkRequiredEnvVars(): EnvCheckResult {
  const missing: string[] = [];
  const present: string[] = [];
  const status: Record<string, boolean> = {};

  for (const { key } of REQUIRED_ENV_VARS) {
    const val = process.env[key];
    const isSet = typeof val === 'string' && val.trim().length > 0;
    status[key] = isSet;
    if (isSet) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  return { ok: missing.length === 0, missing, present, status };
}

/**
 * Log a structured warning when CRON_SECRET is not configured.
 *
 * Call unconditionally at the top of each operator route handler — before the
 * auth check — so the warning fires on cold start and appears in Vercel logs
 * whether or not the request is authenticated. This surfaces the misconfiguration
 * without waiting for someone to notice opaque 401s.
 *
 * The warning fires at most once per cold start (subsequent calls on the same
 * serverless instance are silently skipped via module-level flag).
 */
let _cronSecretWarningEmitted = false;

export function warnIfCronSecretMissing(routeName: string): void {
  const val = process.env.CRON_SECRET;
  const isSet = typeof val === 'string' && val.trim().length > 0;

  if (!isSet && !_cronSecretWarningEmitted) {
    _cronSecretWarningEmitted = true;
    logWarn('CRON_SECRET is not configured — all operator endpoints will reject Bearer token requests', {
      action: 'env-check.warnIfCronSecretMissing',
      route: routeName,
      impact: 'memory-status, memory-repair, memory-admin endpoints inaccessible; manual memory-sync trigger disabled',
    });
  }
}
