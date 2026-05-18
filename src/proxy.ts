import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLoginRedirectPath } from '@/lib/auth/redirects';

const APP_HOST = 'app.getsos.app';
const APP_ORIGIN = `https://${APP_HOST}`;

function requestHost(request: NextRequest) {
  return request.headers.get('host')?.split(':')[0] ?? '';
}

function isAppHost(request: NextRequest) {
  return requestHost(request) === APP_HOST;
}

function isLocalPreviewHost(request: NextRequest) {
  const host = requestHost(request);
  return host === 'localhost' || host === '127.0.0.1';
}

function appUrl(path: string, request: NextRequest) {
  const url = new URL(path, APP_ORIGIN);
  url.search = request.nextUrl.search;
  return url;
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

  // Marketing-domain app/auth/tester paths should move to the app subdomain.
  // Localhost stays local so design/dev preview can inspect app routes without bouncing to production.
  const isAppSurfacePath = path.startsWith('/auth')
    || path.startsWith('/onboarding')
    || path.startsWith('/upgrade')
    || path === '/home'
    || path === '/access'
    || path === '/install'
    || path === '/tester';
  if (!onAppHost && !isLocalPreviewHost(request) && isAppSurfacePath) {
    return NextResponse.redirect(appUrl(path, request));
  }

  // API routes handle their own auth — don't redirect them
  if (path.startsWith('/api')) {
    return supabaseResponse;
  }

  // Public tester start page must remain reachable even if the viewer has an existing session.
  // It is the free onboarding entry point for invited testers/investors.
  if (path === '/tester' || path === '/install') {
    return supabaseResponse;
  }

  // Local-only design preview routes stay unauthenticated for visual QA.
  // Do not expose these on production/app host.
  if (isLocalPreviewHost(request) && path.startsWith('/dev/')) {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)',
  ],
};
