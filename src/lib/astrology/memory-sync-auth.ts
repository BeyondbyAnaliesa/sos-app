export type MemorySyncAuthType = 'bearer' | 'vercel_cron';

/**
 * Returns the auth path that succeeded, or false if the request is unauthorized.
 *
 * Security posture:
 * - If CRON_SECRET is configured, require an exact Bearer token match. Vercel Cron
 *   sends this automatically when the env var exists.
 * - Only allow Vercel cron headers as a fallback when CRON_SECRET is absent, which
 *   keeps local/preview cron testing possible without making public header spoofing
 *   an auth bypass in production.
 */
export function getMemorySyncAuthType(request: Request, cronSecret?: string): MemorySyncAuthType | false {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (cronSecret) {
    return bearer === cronSecret ? 'bearer' : false;
  }

  const vercelCron = request.headers.get('x-vercel-cron');
  const vercelDeployment = request.headers.get('x-vercel-deployment-url');
  if (vercelCron && vercelDeployment) return 'vercel_cron';

  return false;
}
