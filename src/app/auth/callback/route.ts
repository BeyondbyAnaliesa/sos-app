import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafePostLoginRedirect } from '@/lib/auth/redirects';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = getSafePostLoginRedirect(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(redirectTo, origin));
}
