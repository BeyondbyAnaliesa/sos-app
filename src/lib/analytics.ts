/**
 * Lightweight analytics helper.
 * Logs to console in dev. Swap the `track` implementation to pipe to
 * Posthog, Mixpanel, Amplitude, or any provider — the call sites stay the same.
 */

type AnalyticsEvent =
  | 'signup_complete'
  | 'onboarding_complete'
  | 'journal_entry_created'
  | 'checkout_started'
  | 'checkout_complete'
  | 'reading_viewed'
  | 'calendar_viewed';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Track an analytics event. Safe to call on both client and server.
 *
 * In development: logs to console.
 * In production: replace the body with your provider's SDK call.
 */
export function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (IS_DEV) {
    console.log(`[analytics] ${event}`, properties ?? '');
    return;
  }

  // --- Production provider goes here ---
  // Example: posthog.capture(event, properties);
  // Example: mixpanel.track(event, properties);

  // For now, structured console log so Vercel logs capture it
  console.log(JSON.stringify({ _event: event, ...properties, _ts: Date.now() }));
}

/**
 * Client-side track helper that fires and forgets.
 * Use this in client components — it's the same function, just explicit about context.
 */
export const trackClient = track;
