export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isValidTesterAccessCode, testerAccessConfigured, TESTER_ACCESS_PRICE_ID } from '@/lib/access/tester-access';
import { logError } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!testerAccessConfigured()) {
      logError(new Error('SOS_TESTER_ACCESS_CODES is not configured'), { route: '/api/access/tester' });
      return NextResponse.json({ error: 'Tester access is not configured yet.' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const code = typeof body.code === 'string' ? body.code : null;

    if (!isValidTesterAccessCode(code)) {
      return NextResponse.json({ error: 'That access code is not valid.' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('subscriptions').upsert(
      {
        user_id:                user.id,
        status:                 'active',
        price_id:               TESTER_ACCESS_PRICE_ID,
        stripe_customer_id:     null,
        stripe_subscription_id: null,
        updated_at:             new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) throw error;

    return NextResponse.json({ ok: true, redirectTo: '/' });
  } catch (err) {
    logError(err, { route: '/api/access/tester' });
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
