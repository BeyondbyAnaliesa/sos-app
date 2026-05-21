import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadCharterModule(env: Record<string, string> = {}) {
  vi.resetModules();
  delete process.env.STRIPE_PRICE_ID_CHARTER;
  Object.assign(process.env, env);
  return import('../charter');
}

afterEach(() => {
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('Charter seat helpers', () => {
  it('marks Charter sold out at the 100-seat limit', async () => {
    const { isCharterSoldOut } = await loadCharterModule();

    expect(isCharterSoldOut(99)).toBe(false);
    expect(isCharterSoldOut(100)).toBe(true);
    expect(isCharterSoldOut(101)).toBe(true);
  });

  it('counts active Charter subscriptions by price ID and active statuses', async () => {
    const inMock = vi.fn().mockResolvedValue({ count: 42, error: null });
    const eqMock = vi.fn(() => ({ in: inMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const { getActiveCharterSeatCount } = await loadCharterModule({
      STRIPE_PRICE_ID_CHARTER: 'price_charter',
    });

    await expect(getActiveCharterSeatCount({ from: fromMock } as never)).resolves.toBe(42);

    expect(fromMock).toHaveBeenCalledWith('subscriptions');
    expect(selectMock).toHaveBeenCalledWith('user_id', { count: 'exact', head: true });
    expect(eqMock).toHaveBeenCalledWith('price_id', 'price_charter');
    expect(inMock).toHaveBeenCalledWith('status', ['active', 'trialing']);
  });
});
