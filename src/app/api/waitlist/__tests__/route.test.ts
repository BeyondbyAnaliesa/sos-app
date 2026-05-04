import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

function request(body: unknown) {
  return new Request('https://www.getsos.app/api/waitlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/waitlist', () => {
  it('rejects invalid email before calling Beehiiv', async () => {
    vi.stubEnv('BEEHIIV_API_KEY', 'beehiiv-key');
    vi.stubEnv('BEEHIIV_PUBLICATION_ID', 'pub-id');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({ email: 'not-an-email' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Enter a valid email address.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes valid email and preserves clean attribution before subscribing', async () => {
    vi.stubEnv('BEEHIIV_API_KEY', 'beehiiv-key');
    vi.stubEnv('BEEHIIV_PUBLICATION_ID', 'pub-id');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request({
        email: '  PERSON@EXAMPLE.COM  ',
        utm_source: 'substack',
        utm_medium: 'note',
        utm_campaign: 'post1-proof',
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      email: 'person@example.com',
      utm_source: 'substack',
      utm_medium: 'note',
      utm_campaign: 'post1-proof',
    });
  });

  it('falls back to default attribution when values are unsafe', async () => {
    vi.stubEnv('BEEHIIV_API_KEY', 'beehiiv-key');
    vi.stubEnv('BEEHIIV_PUBLICATION_ID', 'pub-id');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request({
        email: 'person@example.com',
        utm_source: '<script>',
        utm_medium: 'wait list',
        utm_campaign: 'launch!',
      }),
    );

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      utm_source: 'getsos.app',
      utm_medium: 'waitlist',
      utm_campaign: 'launch',
    });
  });
});
