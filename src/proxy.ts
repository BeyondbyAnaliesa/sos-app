import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLoginRedirectPath } from '@/lib/auth/redirects';

const APP_HOST = 'app.getsos.app';

function isAppHost(request: NextRequest) {
  return request.headers.get('host')?.split(':')[0] === APP_HOST;
}

export default async function proxy(request: NextRequest) {
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
  const onAppHost = isAppHost(request);

  // Keep the marketing root purely public. Logged-in app home lives on app.getsos.app/home.
  if (onAppHost && path === '/') {
    return NextResponse.redirect(new URL(user ? '/home' : '/auth/login', request.url));
  }

  // API routes handle their own auth — don't redirect them
  if (path.startsWith('/api')) {
    return supabaseResponse;
  }

  // Public web app assets must stay reachable before auth
  if (path === '/sw.js' || path === '/manifest.webmanifest') {
    return supabaseResponse;
  }

  // Allow auth routes through. Password recovery links must remain reachable
  // even when the browser already has a session, because Supabase reset emails
  // can be opened from a signed-in device.
  if (path.startsWith('/auth')) {
    if (user && path !== '/auth/reset-password') {
      // Already logged in — redirect away from routine auth pages
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return supabaseResponse;
  }

  // Allow the public landing page through for everyone on the marketing domain.
  if (!onAppHost && path === '/') {
    return supabaseResponse;
  }

  // Not logged in — send protected routes to login
  if (!user) {
    return NextResponse.redirect(
      new URL(getLoginRedirectPath(path, request.nextUrl.search), request.url),
    );
  }

  // Logged in — check onboarding status from user metadata
  const onboardingComplete = user.user_metadata?.onboarding_complete === true;
  const isPreOnboardingAllowedRoute = path.startsWith('/onboarding') || path.startsWith('/upgrade');

  if (!onboardingComplete && !isPreOnboardingAllowedRoute) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (onboardingComplete && path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
