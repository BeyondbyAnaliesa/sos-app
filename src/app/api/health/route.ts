import pkg from '../../../../package.json';

export const runtime = 'nodejs';

type HealthProvenanceSource = 'git_commit' | 'deployment' | 'app_version' | 'manual';

function getHealthProvenance() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    null;
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || pkg.version || null;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || null;
  const deploymentUrl = process.env.VERCEL_URL || null;
  const region = process.env.VERCEL_REGION || null;
  const environment = process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || null;

  let source: HealthProvenanceSource = 'manual';
  let version = 'manual';

  if (commitSha) {
    source = 'git_commit';
    version = commitSha.slice(0, 7);
  } else if (deploymentId) {
    source = 'deployment';
    version = `deploy:${deploymentId.replace(/^dpl_/, '').slice(0, 8)}`;
  } else if (appVersion) {
    source = 'app_version';
    version = `app:${appVersion}`;
  }

  return {
    version,
    provenance: {
      source,
      commitSha: commitSha ? commitSha.slice(0, 7) : null,
      appVersion,
      deploymentId,
      deploymentUrl,
      region,
      environment,
    },
  };
}

export async function GET() {
  const { version, provenance } = getHealthProvenance();

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version,
    provenance,
  });
}
