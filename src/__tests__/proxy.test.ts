import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let mockUser: unknown = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
    },
  }),
}));

describe('proxy auth route handling', () => {
  it('keeps password reset reachable for already signed-in users', async () => {
    mockUser = { user_metadata: { onboarding_complete: true } };
    const { default: proxy } = await import('../proxy');

    const response = await proxy(new NextRequest('https://www.getsos.app/auth/reset-password?code=recovery-code'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects signed-in users away from routine auth pages', async () => {
    mockUser = { user_metadata: { onboarding_complete: true } };
    const { default: proxy } = await import('../proxy');

    const response = await proxy(new NextRequest('https://www.getsos.app/auth/login'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://www.getsos.app/');
  });
});
