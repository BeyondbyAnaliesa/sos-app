# 06 — Entitlement and Capability Audit

Status: updated after first native iOS scaffold; Xcode/signing/IAP still missing
Last updated: 2026-04-30
Scope: `/Users/beyond/SOS-App`

## Executive summary

The audited repo is now a **Next.js web/PWA app with a first Capacitor iOS shell**, not yet a fully submission-ready native iOS app.

What now exists:
- Xcode project: `ios/App/App.xcodeproj/project.pbxproj`
- iOS app delegate: `ios/App/App/AppDelegate.swift`
- Info.plist: `ios/App/App/Info.plist`
- Capacitor config: `capacitor.config.ts`
- Native shell doc: `docs/app-store-readiness/07-ios-capacitor-container.md`
- PWA manifest (`src/app/manifest.ts`)
- Apple web app metadata (`src/app/layout.tsx`)
- service worker registration (`src/components/ServiceWorkerRegistrar.tsx`, `public/sw.js`)

What is still missing:
- `.entitlements` file
- native capability configuration beyond the default Capacitor shell
- full Xcode/signing/archive validation
- StoreKit / IAP implementation
- APNs / ATT / Sign in with Apple wiring

So for App Store/TestFlight readiness, the correct current answer is: **native scaffold exists, but submission capabilities and archive validation are not wired yet**.

## Files searched

Searched for:
- `Info.plist`
- `*.entitlements`
- `*.xcodeproj`
- `*.xcworkspace`
- `project.pbxproj`
- StoreKit / ATT / notification / location / Apple sign-in references

Result after 2026-04-30 scaffold:
- `ios/App/App.xcodeproj/project.pbxproj` found
- `ios/App/App/Info.plist` found
- no `.entitlements` file found
- no `.storekit` config found

## Capability audit table

| Capability / setting | Current status | Evidence | Notes |
|---|---|---|---|
| Native iOS app target | Scaffolded | `ios/App/App.xcodeproj/project.pbxproj` | Needs full Xcode validation/signing/archive |
| `Info.plist` | Scaffolded | `ios/App/App/Info.plist` | Default Capacitor plist; usage-description strings only needed if permissions are added |
| Entitlements file | Missing | no `.entitlements` file found | No native entitlements currently declared |
| Push Notifications | Not wired | no APNs, push, or notification-token code found | No review notes needed yet; add only if native push is implemented |
| Background Modes | Not wired | no entitlements/capability config found | None currently required from repo evidence |
| Sign in with Apple | Not wired | auth is Supabase email/password only | `src/app/auth/signup/page.tsx`, `src/app/auth/login/page.tsx` |
| App Tracking Transparency (ATT) | Not wired | no ATT framework/code found | also consistent with no ad/tracking SDK found |
| Location usage strings | Not wired natively | no `Info.plist`; no `CLLocationManager` usage | app asks user to type birthplace instead of requesting device location |
| In-App Purchases capability | Not wired | no StoreKit config/code or entitlements found | current native shell hides web Stripe checkout; StoreKit still needed for native paid purchases |
| Associated Domains / universal links | Not found | no associated-domains entitlement found | may be needed later depending on auth/deeplink strategy |
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
- [x] Create iOS project/target or wrapper strategy
- [x] Add `Info.plist`
- [ ] Validate project with full Xcode selected
- [ ] Configure signing team and bundle identifier
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

From an entitlement/capability perspective, the repo has moved from **pre-native** to **native scaffold present**.

For TestFlight/App Store readiness, the remaining work is not polish: it is Xcode/signing/archive validation plus StoreKit/IAP and any required entitlements.
