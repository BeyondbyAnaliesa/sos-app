export const runtime = 'nodejs';

import Stripe from 'stripe';
import stripe from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook error: ${err instanceof Error ? err.message : 'Unknown'}`, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      // ── Checkout completed ──────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.supabase_user_id;
        const plan   = session.metadata?.plan;
        if (!userId) break;

        // Retrieve the full subscription object
        const stripeSubId = session.subscription as string;
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

        const item = stripeSub.items.data[0];
        await admin.from('subscriptions').upsert({
          user_id:               userId,
          stripe_customer_id:    session.customer as string,
          stripe_subscription_id: stripeSubId,
          stripe_price_id:       item?.price.id ?? null,
          plan:                  plan ?? resolvePlan(item?.price.id),
          status:                stripeSub.status,
          current_period_end:    item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end:  stripeSub.cancel_at_period_end,
          updated_at:            new Date().toISOString(),
        }, { onConflict: 'user_id' });

        break;
      }

      // ── Subscription updated (renewal, plan change, cancellation toggle) ───
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const subItem = sub.items.data[0];
        await admin.from('subscriptions').upsert({
          user_id:               userId,
          stripe_customer_id:    sub.customer as string,
          stripe_subscription_id: sub.id,
          stripe_price_id:       subItem?.price.id ?? null,
          plan:                  resolvePlan(subItem?.price.id),
          status:                sub.status,
          current_period_end:    subItem?.current_period_end
            ? new Date(subItem.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end:  sub.cancel_at_period_end,
          updated_at:            new Date().toISOString(),
        }, { onConflict: 'user_id' });

        break;
      }

      // ── Subscription deleted (hard cancel) ──────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await admin.from('subscriptions').upsert({
          user_id:               userId,
          stripe_subscription_id: sub.id,
          status:                'canceled',
          cancel_at_period_end:  false,
          updated_at:            new Date().toISOString(),
        }, { onConflict: 'user_id' });

        break;
      }

      default:
        // Unhandled event — return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    // Return 500 so Stripe retries — transient DB errors should self-heal
    return new Response('Internal error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}

/** Map a Stripe price ID back to our plan key. */
function resolvePlan(priceId: string | undefined): string | null {
  if (!priceId) return null;
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key;
  }
  return null;
}
