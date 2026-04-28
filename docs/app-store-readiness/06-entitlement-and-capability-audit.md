# 06 — Entitlement and Capability Audit

Status: scaffolded from repo audit; native iOS target missing
Last updated: 2026-04-28
Scope: `/Users/beyond/SOS-App`

## Executive summary

The current audited repo is a **Next.js web/PWA app**, not a wired native iOS codebase.

I found:
- **no Xcode project**
- **no `Info.plist`**
- **no `.entitlements` file**
- **no native capability configuration**
- **no StoreKit / APNs / ATT / Sign in with Apple wiring**

What does exist:
- PWA manifest (`src/app/manifest.ts`)
- Apple web app metadata (`src/app/layout.tsx`)
- service worker registration (`src/components/ServiceWorkerRegistrar.tsx`, `public/sw.js`)

So for App Store/TestFlight readiness, the correct current answer is mostly: **not wired yet**.

## Files searched

Searched for:
- `Info.plist`
- `*.entitlements`
- `*.xcodeproj`
- `*.xcworkspace`
- `project.pbxproj`
- StoreKit / ATT / notification / location / Apple sign-in references

Result:
- none of the native iOS project/config files were found

## Capability audit table

| Capability / setting | Current status | Evidence | Notes |
|---|---|---|---|
| Native iOS app target | Missing | no Xcode project files found | Must exist before TestFlight/App Store submission |
| `Info.plist` | Missing | file search returned none | No iOS usage-description strings can be configured yet |
| Entitlements file | Missing | file search returned none | No native entitlements currently declared |
| Push Notifications | Not wired | no APNs, push, or notification-token code found | No review notes needed yet; add only if native push is implemented |
| Background Modes | Not wired | no native target/capability files | None currently required from repo evidence |
| Sign in with Apple | Not wired | auth is Supabase email/password only | `src/app/auth/signup/page.tsx`, `src/app/auth/login/page.tsx` |
| App Tracking Transparency (ATT) | Not wired | no ATT framework/code found | also consistent with no ad/tracking SDK found |
| Location usage strings | Not wired natively | no `Info.plist`; no `CLLocationManager` usage | app asks user to type birthplace instead of requesting device location |
| In-App Purchases capability | Not wired | no native StoreKit or iOS target found | current billing is web Stripe |
| Associated Domains / universal links | Not found | no iOS target/capability files | may be needed later depending on auth/deeplink strategy |
| Keychain sharing | Not found | no entitlements file | not currently auditable |
| Background fetch / processing | Not found | no native target/capability files | not currently auditable |
| Apple Pay | Not found | Stripe Checkout is web redirect, not Apple Pay capability wiring | if added later, separate entitlement review needed |

## Location audit

### What the app actually does now
- collects **typed birth location text** during onboarding
- geocodes that string through Nominatim
- stores location text + latitude/longitude in backend
- does **not** request live device GPS location

Evidence:
- `src/components/onboarding/BirthDataStep.tsx`
- `src/lib/astrology/geocode.ts`
- `src/app/api/onboarding/chart/route.ts`

### App Store implication
If the shipping iOS app continues using typed birthplace only, native location permission may not be needed.

If future iOS UX adds “use current location,” then the app will need:
- `NSLocationWhenInUseUsageDescription`
- possible review-note explanation for why live location is needed
- updated privacy disclosures

## Push notifications audit

No evidence found for:
- APNs token registration
- notification permission prompt
- remote notification handlers
- local notification scheduling
- push-capable entitlement files

Conclusion:
- push notifications are currently **absent**
- no push capability should be declared unless implemented

## ATT / tracking audit

No evidence found for:
- `AppTrackingTransparency`
- `ATTrackingManager`
- IDFA usage
- ad SDKs
- attribution SDKs

Conclusion:
- ATT prompt is currently **not needed** based on repo audit
- if ad attribution or cross-app tracking is added later, revisit both capability and privacy label work

## Sign in with Apple audit

### Current auth flow
- Supabase email/password signup
- Supabase email/password login
- auth callback route exists for session exchange, but no Apple OAuth/sign-in wiring was found

Evidence:
- `src/app/auth/signup/page.tsx`
- `src/app/auth/login/page.tsx`
- `src/app/auth/callback/route.ts`

### App Store implication
- If the native app continues with **only email/password**, Sign in with Apple is not automatically required solely from this repo state.
- If any third-party social login is later added, revisit Apple’s Sign in with Apple parity rules.

## PWA-specific iOS-adjacent configuration already present

These are not App Store native capabilities, but they do exist:

### Web app metadata
- `appleWebApp.capable = true`
- `appleWebApp.statusBarStyle = 'black-translucent'`
- Apple touch icon configured

Evidence:
- `src/app/layout.tsx`

### PWA manifest
- standalone display mode
- portrait orientation
- app icons declared
- one screenshot entry declared

Evidence:
- `src/app/manifest.ts`

### Service worker
- app shell precaching
- network/cache strategy for pages/assets

Evidence:
- `src/components/ServiceWorkerRegistrar.tsx`
- `public/sw.js`

These help PWA behavior, but they do **not** satisfy native App Store/TestFlight requirements.

## Missing items before a native submission can be considered ready

### Native shell / project setup
- [ ] Create iOS project/target or wrapper strategy
- [ ] Add `Info.plist`
- [ ] Add entitlements file if needed
- [ ] Decide iPhone-only vs universal/iPad support

### Billing
- [ ] Add In-App Purchases capability if using App Store subscriptions
- [ ] Implement StoreKit 2 flow
- [ ] Add restore purchases path

### Auth
- [ ] Decide whether current auth remains email/password web-backed or becomes native-auth surfaced
- [ ] Verify deep link / callback handling in native container if needed

### Permissions
- [ ] Add location usage strings only if live device location is introduced
- [ ] Add notification capability only if push is introduced
- [ ] Add ATT only if tracking/ad tech is introduced

## Bottom line

From an entitlement/capability perspective, the repo is currently at **pre-native** stage.

For TestFlight/App Store readiness, this area is not a polish task; it is a missing implementation layer.
