import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAeonUsageStatus } from '@/lib/aeon/usage';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usage = await getAeonUsageStatus(user.id);
    return NextResponse.json({ usage });
  } catch (err) {
    console.error('Aeon usage fetch failed:', err);
    return NextResponse.json({ error: 'Unable to load usage' }, { status: 500 });
  }
}
