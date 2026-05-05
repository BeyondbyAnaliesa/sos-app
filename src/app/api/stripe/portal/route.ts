export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { logError } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe plan is attached to this account yet.' }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/more`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    logError(err, { route: '/api/stripe/portal' });
    return NextResponse.json({ error: 'Unable to open billing portal.' }, { status: 500 });
  }
}
