# 02 — Privacy Nutrition Labels

Status: updated after privacy route; legal review required before filing
Last updated: 2026-04-30
Scope: `/Users/beyond/SOS-App` only

## Important scope note

This audit is based on the live repo code plus the initial product-facing privacy route at `src/app/privacy/page.tsx`, not a DPIA, legal memo, or Supabase schema dump.

That means this document is strong on **what the app code sends, stores, and logs**, but still needs legal review for:
- retention periods
- vendor contracts / DPAs
- exact row-level schema in Supabase
- whether internal logs should be disclosed as Usage Data / Diagnostics
- whether journal content should be disclosed under Sensitive Info in addition to User Content
- whether recently completed encrypted-at-rest journal protections cover every production table/surface claimed in external copy

## Vendors/processors observed in code

- **Supabase** — auth, session handling, and primary app database
- **OpenAI** — onboarding report generation, natal reading generation, journal companion responses
- **Stripe** — subscription checkout and webhook-based billing state updates
- **OpenStreetMap Nominatim** — geocoding typed birth-location text
- **Vercel / server logs** — analytics and error logging currently written to console in production paths

## High-confidence data collection map

| App Store category | Data observed in code | How it is collected | Linked to user? | Used for tracking? | Purpose | Evidence |
|---|---|---|---|---|---|---|
| Contact Info | Email address | User enters email at signup/login; email also passed to Stripe customer creation | Yes | No | Account creation, login, billing receipts/support | `src/app/auth/signup/page.tsx`, `src/app/auth/login/page.tsx`, `src/app/api/stripe/checkout/route.ts` |
| User Content | Journal entry text, follow-up journal messages | User types into journal UI; server stores entry + chat thread | Yes | No | Core journaling and AI companion functionality | `src/app/journal/page.tsx`, `src/app/api/journal/chat/route.ts` |
| User Content | Onboarding long-form answers | User types answers during onboarding; server upserts responses | Yes | No | Personalization / onboarding report generation | `src/app/onboarding/page.tsx`, `src/app/api/onboarding/complete/route.ts` |
| User Content | Feedback message text | User types feedback into in-app form; server stores or logs fallback | Yes | No | Support and product improvement | `src/app/feedback/page.tsx`, `src/app/api/feedback/route.ts` |
| Sensitive Info / User Content (legal review) | Reflective journal text and onboarding responses may contain mental-health, spiritual, relationship, or other intimate personal details | Free-text inputs provided by the user | Yes | No | Core functionality / personalization | same as above; classification needs legal confirmation |
| Location | Birthplace text, geocoded latitude/longitude, geocoded display name | User types birthplace; server geocodes via Nominatim and stores text + coordinates | Yes | No | Natal chart calculation | `src/components/onboarding/BirthDataStep.tsx`, `src/lib/astrology/geocode.ts`, `src/app/api/onboarding/chart/route.ts` |
| Sensitive Info | Birth date and birth time | User types during onboarding; server stores birth data | Yes | No | Natal chart calculation | `src/components/onboarding/BirthDataStep.tsx`, `src/app/api/onboarding/chart/route.ts` |
| Purchases | Subscription plan, status, period end, Stripe customer/subscription/price IDs | Generated during checkout and Stripe webhooks | Yes | No | Billing, entitlement state | `src/lib/stripe.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/lib/subscription.ts` |
| Identifiers | Supabase user ID; Stripe customer ID; Stripe subscription ID | Created by auth/billing flows; stored server-side | Yes | No | Account linkage, subscription linkage, server operations | `src/lib/subscription.ts`, Stripe routes, Supabase auth usage across app |
| Usage Data (product interaction) | Signup, onboarding complete, journal created, reading/calendar/checkout events with userId/plan/etc. | App calls `track(...)`; currently logs structured events to console in production | Yes | No | Product analytics / funnel monitoring | `src/lib/analytics.ts`, callsites across app |
| Diagnostics | Error message, partial stack, route, sometimes context such as event type or userId | Server-side `logError(...)` writes structured error payloads to console | Possibly | No | Debugging / reliability | `src/lib/logger.ts`, route callsites |
| Other Data | User agent string inside feedback metadata | Read from request header during feedback submit | Likely yes | No | Troubleshooting support issues | `src/app/api/feedback/route.ts` |
| Other Data | Auth session cookies | Managed by Supabase SSR/session middleware | Yes | No | Authentication/session continuity | `src/lib/supabase/server.ts`, `src/proxy.ts` |
| Other Data | Onboarding progress in localStorage | Stored on device only in browser localStorage | N/A for nutrition label if not transmitted off-device | No | Resume onboarding in client | `src/app/onboarding/page.tsx` |

## Categories not found in code audit

No code evidence found for collecting or transmitting these categories:
- Precise device location from GPS
- Contacts
- Browsing history
- Search history
- HealthKit / medical records
- Financial account / creditworthiness info
- Photos / videos / camera / microphone
- Contact list / address book
- Advertising data
- Device ID for ad tracking
- Crash SDK / third-party diagnostics SDK
- ATT consent flow
- Push notification token

## Likely App Store privacy answers by category

These are working recommendations, not final legal advice.

### Data Used to Track You
- Recommended answer from current code: **No**
- Reason: no ad SDKs, no ATT framework, no cross-app advertising identifier usage, no evidence of third-party ad attribution.

### Data Linked to You
Likely **Yes** for:
- Contact Info (email)
- User Content (journal, onboarding answers, feedback)
- Sensitive Info / highly personal free text (subject to legal classification)
- Location (birthplace text + coordinates)
- Identifiers (user ID, Stripe IDs)
- Purchases / subscription state
- Usage Data (if production console logs are treated as collected analytics)
- Diagnostics (if retained in logs with user-linked context)

### Data Not Linked to You
Possible candidates:
- none with high confidence from current implementation
- localStorage onboarding progress is device-local and not part of the nutrition label unless later transmitted separately

## App Store purpose mapping (working draft)

| Data type | Primary purpose(s) |
|---|---|
| Email | App functionality, account management |
| Journal / onboarding / feedback text | App functionality, personalization, support |
| Birth data + birthplace | App functionality |
| Subscription status + Stripe IDs | Purchases, app functionality |
| Analytics events | Analytics, product improvement |
| Error logs / user agent | App functionality, diagnostics, fraud/security as applicable |

## Specific legal / policy review flags

1. **Journal text classification**
   - The code clearly stores intimate free-text reflections.
   - Legal should decide whether to disclose only as **User Content** or also **Sensitive Info**.

2. **Usage analytics disclosure**
   - `track()` currently becomes structured server logs in production.
   - If those logs are retained/queried operationally, they likely count as collected Usage Data.

3. **Diagnostics disclosure**
   - `logError()` can include route, stack, and contextual fields.
   - Need policy decision on whether this is disclosed as Diagnostics.

4. **Third-party processor disclosure**
   - OpenAI receives onboarding/journal prompt content.
   - Nominatim receives typed birthplace text.
   - Stripe receives billing/customer data.
   - Privacy policy should name these flows plainly.

5. **Encryption claims**
   - Recent project context says four journal-derived surfaces are encrypted at rest.
   - Before App Store review copy or privacy policy uses strong security language, confirm exact production coverage and wording with the implemented system.

6. **Support fallback logging**
   - If the `feedback` table insert fails, the app logs message text, user ID, and email to console.
   - This should be reviewed for retention/access implications.

## Provisional nutrition-label summary

If filing today, the safest provisional stance would likely be:
- **Collected / linked / not tracking:** Contact Info, User Content, Location, Identifiers, Purchases
- **Probably collected / linked / not tracking:** Usage Data, Diagnostics
- **Needs legal classification call:** Sensitive Info

A first product-facing privacy URL now exists at `/privacy`, but do not finalize App Store privacy answers until legal/product confirms the above categories against the actual production data-retention and vendor setup.
