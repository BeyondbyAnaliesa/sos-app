# 05 — Subscription Config Checklist

Status: updated after native iOS shell gate; major StoreKit gaps remain for native App Store submission
Last updated: 2026-04-30

## Target commercial structure

Requested target tiers for App Store planning:
- **Charter** — `$49/year`, first 100 only
- **Member** — `$99/year` or `$12.99/month`
- **Free** — base access tier

## Current codebase reality

The live audited codebase now matches the target web pricing, but does **not** yet implement native App Store purchasing.

### What exists today
- Free signup/auth exists via Supabase email/password
- Stripe checkout exists for web subscription purchase
- Subscription gating exists in product logic
- Paid Stripe plan keys now exist:
  - `charter_annual` = `$49/year`
  - `member_annual` = `$99/year`
  - `member_monthly` = `$12.99/month`
- `allow_promotion_codes: true` is enabled in Stripe Checkout

### What does not exist today
- No App Store IAP / StoreKit products in code
- No StoreKit 2 purchase flow
- No native receipt validation flow
- No App Store Server API / server-to-server notification handling
- No entitlement sync from Apple purchases

Evidence:
- `src/lib/stripe.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/subscription.ts`
- `capacitor.config.ts`
- `src/app/upgrade/page.tsx`
- `src/components/UpgradePricing.tsx`
- `ios/App/App.xcodeproj/project.pbxproj`
- no StoreKit/IAP implementation or `.storekit` config found

## Current functional gating in app

Observed gating behavior from code:
- unpaid users can sign up and onboard
- unpaid users can access Home, Daily Reading, Companion/journal, and limited chart surfaces
- paid users unlock Transit Calendar
- paid users unlock deeper chart surfaces like full chart + key aspects

Evidence:
- `src/app/page.tsx`
- `src/app/reading/page.tsx`
- `src/app/calendar/page.tsx`
- `src/app/upgrade/page.tsx`

## Free tier checklist

Decide and document exactly what Free means in App Store metadata and native product logic.

Based on current code, Free appears to include:
- account creation
- onboarding
- daily reading
- companion journal flow
- partial natal-reading surfaces

Needs confirmation:
- whether free journaling should remain unlimited
- whether free users should see limited history / fewer companion turns / no memory depth
- whether free users should see blurred chart sections as they do now

## Charter / first-100 constraint

### Important App Store reality
App Store Connect does **not** provide a built-in “first 100 subscribers only” rule for auto-closing a subscription product after 100 purchases.

### Practical options

#### Option A — Time-boxed Charter product, manually retired
- Create a distinct `Charter Annual` IAP
- Watch subscriber count manually
- Remove from sale after threshold is reached
- Pros: simple mental model
- Cons: operationally manual; race condition around the cutoff; harder to guarantee exactly 100

#### Option B — App-side eligibility gate + hidden Charter offer
- App checks server-side eligibility before surfacing Charter
- Once threshold is hit, hide Charter from eligible UI paths
- Still need caution: App Review will expect purchasable products to behave predictably
- Better for soft-capping than exact-capping

#### Option C — Offer codes / promotional codes
- Use standard Member product in App Store and apply introductory/offer-code discounts for the first cohort
- Pros: more App-Store-native than a hard “first 100 only” promise
- Cons: not the same as a permanent named first-100 tier unless carefully messaged

#### Option D — Stripe-side enforcement (web only, not acceptable for native digital unlocks)
- This works for web billing, not for native App Store digital-subscription compliance
- Include only as historical/web context, not as the native submission plan

### Recommendation
For App Store submission, the cleanest path is usually:
1. avoid promising an exact first-100 gate unless ops can enforce it cleanly
2. either use a temporary Charter product retired manually
3. or translate “first 100” into a launch offer / introductory price construct that App Store tooling supports more naturally

## StoreKit 2 vs server-side validation audit

### StoreKit 2
- **Status:** not present
- No Swift/iOS code found
- No StoreKit framework usage found
- No `.storekit` config file found
- No purchase, restore, or entitlement observer code found

### Server-side Apple purchase validation
- **Status:** not present
- No Apple receipt validation code found
- No App Store Server API client found
- No App Store Server Notifications endpoint found
- No Apple transaction storage schema found in repo

### What exists instead
- Stripe Checkout session creation
- Stripe webhook processing
- subscription table reads/writes keyed by `user_id`

### Conclusion
Current billing is **server-side Stripe for web**, not StoreKit 2 and not App Store-native.

## Implementation checklist before native submission

### Product and pricing
- [ ] Decide whether Charter will truly be exact first-100 or a softer launch offer
- [ ] Finalize native product names and durations
- [ ] Finalize monthly plan decision (`$12.99/mo`)
- [ ] Align all app copy to final IAP names

### App Store Connect
- [ ] Create subscription group
- [ ] Create Charter annual product if keeping it
- [ ] Create Member annual product
- [ ] Create Member monthly product if keeping it
- [ ] Configure localizations, review screenshots, and pricing schedules

### App implementation
- [ ] Add native iOS target if one does not yet exist
- [ ] Implement StoreKit 2 purchase flow
- [ ] Implement restore purchases
- [ ] Implement entitlement refresh on launch and account restore path
- [x] Conditionally disable web Stripe purchase flow in native iOS shell for digital content
- [ ] Implement StoreKit 2 purchase flow

### Server / backend
- [ ] Decide whether subscriptions remain mirrored in Supabase `subscriptions` table
- [ ] Add Apple transaction/entitlement ingestion if server reconciliation is needed
- [ ] Add App Store Server Notifications handling if using server-side reconciliation
- [ ] Define source-of-truth rules when Apple and web entitlements both exist

### UX / support
- [ ] Define Free vs paid boundary clearly
- [ ] Define migration path if existing Stripe users also use iOS app
- [ ] Define restore-purchase support notes
- [ ] Update FAQ / support docs for App Store billing

## Key blocker summary

If the goal is App Store/TestFlight readiness, subscriptions are one of the biggest blockers right now.

Current status:
- web Stripe: **implemented for web**
- native iOS Stripe exposure: **gated off via `SOSNativeIOS` user-agent path**
- free tier: **partially implied by gating, not formally defined as App Store IAP structure**
- App Store IAP / StoreKit 2: **missing**
- first-100 Charter enforcement: **not solved**
