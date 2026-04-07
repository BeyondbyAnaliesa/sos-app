export const STRIPE_PRICE_LOOKUP_KEYS = {
  foundingAnnual: 'sos_founding_annual',
  standardAnnual: 'sos_standard_annual',
} as const;

export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
] as const;
