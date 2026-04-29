export type MemorySyncAuthType = 'bearer' | 'vercel_cron';

function hasVercelCronHeaders(request: Request): boolean {
  return !!(
    request.headers.get('x-vercel-cron')
    && request.headers.get('x-vercel-deployment-url')
  );
}

/**
 * Returns the auth path that succeeded, or false if the request is unauthorized.
 *
 * Security posture:
 * - If CRON_SECRET is configured, require an exact Bearer token match. Vercel Cron
 *   sends this automatically when the env var exists.
 * - Preserve scheduler observability by classifying valid bearer+cron-header requests
 *   as `vercel_cron`; manual bearer calls remain `bearer`.
 * - Only allow Vercel cron headers without bearer as a fallback when CRON_SECRET is
 *   absent, which keeps local/preview cron testing possible without making public
 *   header spoofing an auth bypass in production.
 */
export function getMemorySyncAuthType(request: Request, cronSecret?: string): MemorySyncAuthType | false {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const hasCronHeaders = hasVercelCronHeaders(request);

  if (cronSecret) {
    if (bearer !== cronSecret) return false;
    return hasCronHeaders ? 'vercel_cron' : 'bearer';
  }

  return hasCronHeaders ? 'vercel_cron' : false;
}
