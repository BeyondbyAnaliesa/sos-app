import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const logErrorMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

vi.mock('@/lib/logger', () => ({
  logError: logErrorMock,
}));

async function loadRoute() {
  vi.resetModules();
  return import('../route');
}

function request(body: unknown) {
  return new Request('https://www.getsos.app/api/feedback', {
    method:  'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body:    JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

describe('/api/feedback', () => {
  it('rejects logged-out users', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { POST } = await loadRoute();

    const response = await POST(request({ type: 'bug', message: 'Button broke' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects unknown feedback types', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user_test', email: 'test@example.com' } } });
    const { POST } = await loadRoute();

    const response = await POST(request({ type: 'other', message: 'Hello' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Choose a valid feedback type.' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects empty feedback messages', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user_test', email: 'test@example.com' } } });
    const { POST } = await loadRoute();

    const response = await POST(request({ type: 'bug', message: '   ' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Message required.' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects feedback messages that are too long', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user_test', email: 'test@example.com' } } });
    const { POST } = await loadRoute();

    const response = await POST(request({ type: 'bug', message: 'x'.repeat(2001) }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Keep feedback under 2,000 characters.' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('stores normalized valid feedback', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user_test', email: 'test@example.com' } } });
    insertMock.mockResolvedValue({ error: null });
    const { POST } = await loadRoute();

    const response = await POST(request({ type: 'love', message: '  This helped.  ' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fromMock).toHaveBeenCalledWith('feedback');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user_test',
      type:    'love',
      message: 'This helped.',
      metadata: {
        user_agent: 'vitest',
        timestamp:  expect.any(String),
      },
    });
  });
});
