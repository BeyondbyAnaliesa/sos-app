import Stripe from 'stripe';

// Lazily initialised so build-time page collection doesn't fail when env vars aren't present.
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

// Default export is a Proxy so call-sites can use it like a regular Stripe instance
// (e.g. `stripe.checkout.sessions.create(...)`) without explicit initialisation.
const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default stripe;

// Plan metadata
export const PLANS = {
  founding_annual: {
    priceId:     process.env.STRIPE_PRICE_ID_FOUNDING ?? '',
    name:        'Founding Member',
    price:       79,
    interval:    'year' as const,
    description: 'Locked in for life — this rate never increases.',
  },
  standard_annual: {
    priceId:     process.env.STRIPE_PRICE_ID_STANDARD ?? '',
    name:        'Member',
    price:       99,
    interval:    'year' as const,
    description: 'Full access, billed annually.',
  },
} as const;

export type PlanKey = keyof typeof PLANS;
