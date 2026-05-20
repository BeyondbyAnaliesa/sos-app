import { describe, expect, it, vi } from 'vitest';

const exchangeCodeForSessionMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
  })),
}));

async function loadRoute() {
  vi.resetModules();
  return import('../route');
}

describe('/auth/callback', () => {
  it('exchanges auth code and preserves a safe next route', async () => {
    const { GET } = await loadRoute();

    const response = await GET(new Request('https://app.getsos.app/auth/callback?code=abc&next=%2Faccess'));

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('abc');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.getsos.app/access');
  });

  it('rejects unsafe next routes', async () => {
    const { GET } = await loadRoute();

    const response = await GET(new Request('https://app.getsos.app/auth/callback?code=abc&next=https%3A%2F%2Fevil.example'));

    expect(response.headers.get('location')).toBe('https://app.getsos.app/');
  });
});
