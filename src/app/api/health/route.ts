export const runtime = 'nodejs';

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    'manual';

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version,
  });
}
