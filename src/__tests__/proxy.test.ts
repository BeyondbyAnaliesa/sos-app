import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let mockUser: unknown = null;

function req(url: string) {
  return new NextRequest(url, { headers: { host: new URL(url).host } });
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
    },
  }),
}));

describe('proxy domain and auth route handling', () => {
  it('keeps the marketing root public even for signed-in users', async () => {
    mockUser = { user_metadata: { onboarding_complete: true } };
    const { default: proxy } = await import('../proxy');

    const response = await proxy(req('https://www.getsos.app/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('moves marketing-domain auth routes to the app subdomain', async () => {
    mockUser = null;
    const { default: proxy } = await import('../proxy');

    const response = await proxy(req('https://www.getsos.app/auth/signup?utm_source=substack'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.getsos.app/auth/signup?utm_source=substack');
  });

  it('sends app subdomain root to login when signed out', async () => {
    mockUser = null;
    const { default: proxy } = await import('../proxy');

    const response = await proxy(req('https://app.getsos.app/'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.getsos.app/auth/login');
  });

  it('sends app subdomain root to home when signed in', async () => {
    mockUser = { user_metadata: { onboarding_complete: true } };
    const { default: proxy } = await import('../proxy');

    const response = await proxy(req('https://app.getsos.app/'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.getsos.app/home');
  });

  it('keeps password reset reachable for already signed-in users on app subdomain', async () => {
    mockUser = { user_metadata: { onboarding_complete: true } };
    const { default: proxy } = await import('../proxy');

    const response = await proxy(req('https://app.getsos.app/auth/reset-password?code=recovery-code'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects signed-in users away from routine auth pages to app home', async () => {
    mockUser = { user_metadata: { onboarding_complete: true } };
    const { default: proxy } = await import('../proxy');

    const response = await proxy(req('https://app.getsos.app/auth/login'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.getsos.app/home');
  });
});
