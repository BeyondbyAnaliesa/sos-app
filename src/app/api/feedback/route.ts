import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const FEEDBACK_TYPES = new Set(['bug', 'confusion', 'suggestion', 'love']);
const MAX_FEEDBACK_LENGTH = 2000;

function normalizeFeedback(body: Record<string, unknown>) {
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!FEEDBACK_TYPES.has(type)) {
    return { error: 'Choose a valid feedback type.' };
  }

  if (!message) {
    return { error: 'Message required.' };
  }

  if (message.length > MAX_FEEDBACK_LENGTH) {
    return { error: 'Keep feedback under 2,000 characters.' };
  }

  return { type, message };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const feedback = normalizeFeedback(body);

    if ('error' in feedback) {
      return NextResponse.json({ error: feedback.error }, { status: 400 });
    }

    const admin = createAdminClient();

    // Try to insert into feedback table — if it doesn't exist yet, log to console
    const { error } = await admin
      .from('feedback')
      .insert({
        user_id:  user.id,
        type:     feedback.type,
        message:  feedback.message,
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
        type:   feedback.type,
        message: feedback.message,
        _ts:    Date.now(),
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError(err, { route: '/api/feedback' });
    // Still return success — feedback should never fail visibly
    return NextResponse.json({ ok: true });
  }
}
