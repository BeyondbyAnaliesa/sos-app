#!/usr/bin/env node

const baseUrl = (process.env.SOS_APP_URL || 'https://app.getsos.app').replace(/\/$/, '');
const secret = process.env.CRON_SECRET;

function fail(message, detail) {
  console.error(`FAIL ${message}`);
  if (detail !== undefined) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function request(path, auth = false) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: auth ? { authorization: `Bearer ${secret}` } : undefined,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { response, body };
}

function assertNoPublicCopyFields(value, path = 'root') {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (['caption', 'script', 'headline', 'body'].includes(key)) {
      throw new Error(`public-copy field ${path}.${key} is present`);
    }
    assertNoPublicCopyFields(nested, `${path}.${key}`);
  }
}

async function main() {
  if (!secret) {
    fail('CRON_SECRET is required for authenticated smoke checks.');
    return;
  }

  const health = await request('/api/health');
  if (health.response.status !== 200 || !health.body?.status || !health.body?.provenance) {
    fail('/api/health did not expose status/provenance', { status: health.response.status, body: health.body });
  } else {
    pass(`/api/health ${health.body.status} version=${health.body.version ?? 'unknown'}`);
  }

  const previewNoAuth = await request('/api/reading/channel-brief-preview?fixture=internal-demo');
  if (previewNoAuth.response.status !== 401) {
    fail('channel-brief-preview no-auth should return 401', { status: previewNoAuth.response.status, body: previewNoAuth.body });
  } else {
    pass('channel-brief-preview no-auth returns 401');
  }

  const previewAuth = await request('/api/reading/channel-brief-preview?fixture=internal-demo', true);
  if (previewAuth.response.status !== 200 || previewAuth.body?.ok !== true || previewAuth.body?.preview?.status !== 'astrology-channel-brief-preview-v1') {
    fail('channel-brief-preview auth check failed', { status: previewAuth.response.status, body: previewAuth.body });
  } else {
    pass('channel-brief-preview auth returns preview v1');
  }

  const laneNoAuth = await request('/api/reading/astrology-lane-input?fixture=internal-demo&lane=socials');
  if (laneNoAuth.response.status !== 401) {
    fail('astrology-lane-input no-auth should return 401', { status: laneNoAuth.response.status, body: laneNoAuth.body });
  } else {
    pass('astrology-lane-input no-auth returns 401');
  }

  const laneAuth = await request('/api/reading/astrology-lane-input?fixture=internal-demo&lane=socials', true);
  const exported = laneAuth.body?.export;
  try {
    assertNoPublicCopyFields(exported);
  } catch (error) {
    fail('astrology-lane-input export contains public-copy fields', error instanceof Error ? error.message : String(error));
    return;
  }

  if (
    laneAuth.response.status !== 200
    || laneAuth.body?.ok !== true
    || exported?.status !== 'astrology-lane-input-export-v1'
    || exported?.requestedLane !== 'socials'
    || !Array.isArray(exported?.computedSkyFacts?.computed)
    || !Array.isArray(exported?.computedSkyFacts?.notComputed)
    || !exported?.lanes?.socials
    || Object.keys(exported?.lanes ?? {}).length !== 1
  ) {
    fail('astrology-lane-input auth export check failed', { status: laneAuth.response.status, body: laneAuth.body });
  } else {
    pass(`astrology-lane-input auth returns lane export computed=${exported.computedSkyFacts.computed.length} fenced=${exported.computedSkyFacts.notComputed.length}`);
  }

  if (process.exitCode) return;
  pass('astro engine post-deploy smoke complete');
}

main().catch((error) => {
  fail('astro engine post-deploy smoke crashed', error instanceof Error ? error.stack : String(error));
});
