import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.redirect(new URL(`/auth/signup?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL('/auth/login?message=Check%20your%20email%20to%20confirm%20your%20account.', request.url));
}
