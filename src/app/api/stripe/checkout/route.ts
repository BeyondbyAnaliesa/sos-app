export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import stripe, { PLANS, type PlanKey } from '@/lib/stripe';
import { logError } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as PlanKey;

    if (!PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    if (!planConfig.priceId) {
      return NextResponse.json(
        { error: `Price ID for plan "${plan}" is not configured. Set STRIPE_PRICE_ID_FOUNDING and STRIPE_PRICE_ID_STANDARD in .env.local.` },
        { status: 500 },
      );
    }

    // Look up or create Stripe customer
    const admin = createAdminClient();
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existingSub?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Persist immediately so concurrent requests don't create duplicates
      await admin.from('subscriptions').upsert(
        { user_id: user.id, stripe_customer_id: customerId, status: 'none' },
        { onConflict: 'user_id' },
      );
    }

    // Build return URLs
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'subscription',
      line_items:  [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/upgrade/cancel`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    logError(err, { route: '/api/stripe/checkout' });
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
