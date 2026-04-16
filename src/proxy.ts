import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // API routes handle their own auth — don't redirect them
  if (path.startsWith('/api')) {
    return supabaseResponse;
  }

  // Allow auth routes through
  if (path.startsWith('/auth')) {
    if (user) {
      // Already logged in — redirect away from auth pages
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // Not logged in — send to login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Logged in — check onboarding status from user metadata
  const onboardingComplete = user.user_metadata?.onboarding_complete === true;

  if (!onboardingComplete && !path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (onboardingComplete && path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
