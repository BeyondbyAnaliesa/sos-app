import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, message } = await request.json();

    if (!type || !message?.trim()) {
      return NextResponse.json({ error: 'Type and message required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Try to insert into feedback table — if it doesn't exist yet, log to console
    const { error } = await admin
      .from('feedback')
      .insert({
        user_id:  user.id,
        type,
        message:  message.trim(),
        metadata: {
          user_agent: request.headers.get('user-agent'),
          timestamp:  new Date().toISOString(),
        },
      });

    if (error) {
      // Table might not exist yet — log to console as fallback
      console.log(JSON.stringify({
        _event: 'feedback',
        userId: user.id,
        email:  user.email,
        type,
        message: message.trim(),
        _ts: Date.now(),
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError(err, { route: '/api/feedback' });
    // Still return success — feedback should never fail visibly
    return NextResponse.json({ ok: true });
  }
}
