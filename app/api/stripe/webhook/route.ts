import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_WEBHOOK_EVENTS } from '@/lib/stripe/config';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown signature verification error';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!STRIPE_WEBHOOK_EVENTS.includes(event.type as (typeof STRIPE_WEBHOOK_EVENTS)[number])) {
    return NextResponse.json({ received: true, ignored: true, type: event.type });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      console.log('Stripe webhook received:', event.type, event.data.object.id);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
