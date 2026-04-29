import { describe, expect, it } from 'vitest';
import { getMemorySyncAuthType } from '../memory-sync-auth';

function request(headers: HeadersInit = {}) {
  return new Request('https://www.getsos.app/api/astrology/memory-sync', {
    method: 'POST',
    headers,
  });
}

describe('getMemorySyncAuthType', () => {
  it('requires a matching bearer token when CRON_SECRET is configured', () => {
    expect(getMemorySyncAuthType(request({ authorization: 'Bearer correct' }), 'correct')).toBe('bearer');
    expect(getMemorySyncAuthType(request({ authorization: 'Bearer wrong' }), 'correct')).toBe(false);
  });

  it('does not allow spoofed Vercel cron headers when CRON_SECRET is configured', () => {
    expect(getMemorySyncAuthType(request({
      'x-vercel-cron': '1',
      'x-vercel-deployment-url': 'www.getsos.app',
    }), 'correct')).toBe(false);
  });

  it('allows Vercel cron headers only as fallback when CRON_SECRET is absent', () => {
    expect(getMemorySyncAuthType(request({
      'x-vercel-cron': '1',
      'x-vercel-deployment-url': 'www.getsos.app',
    }))).toBe('vercel_cron');
  });

  it('rejects requests without bearer or complete Vercel cron fallback headers', () => {
    expect(getMemorySyncAuthType(request())).toBe(false);
    expect(getMemorySyncAuthType(request({ 'x-vercel-cron': '1' }))).toBe(false);
  });
});
