# SOS pricing reconciliation audit

Date: 2026-04-28
Repo: `/Users/beyond/SOS-App`
Worktree: `/Users/beyond/SOS-App-pricing-reconciliation`
Branch: `feat/pricing-reconciliation`
Base branch: `main`
Status: **BLOCKED before implementation** — Stripe CLI is not installed in this environment (`stripe: command not found`), so required Stripe API setup could not be performed. Per task rules, no Stripe API writes were attempted.

## Scope checked
- Stripe product/price IDs (env vars + code)
- `Founding` / `founding` references
- `$79`, `$99`, `$12.99` references
- Tier names in TS plan keys / subscription records
- Tier-gating and billing flow
- Pricing in landing / upgrade / success / account surfaces
- Onboarding plan selector references
- Email/lifecycle copy references
- Tests / scripts relevant to validation

## Audit findings

### 1) Stripe configuration and plan constants

**Primary plan map:** `src/lib/stripe.ts`
- `founding_annual`
  - env var: `STRIPE_PRICE_ID_FOUNDING`
  - display name: `Founding Member`
  - price: `79`
  - interval: `year`
  - description: `Locked in for life — this rate never increases.`
- `standard_annual`
  - env var: `STRIPE_PRICE_ID_STANDARD`
  - display name: `Member`
  - price: `99`
  - interval: `year`
  - description: `Full access, billed annually.`

**Implications:**
- Locked sales-page direction is **not** reflected in code.
- Missing plan key for **Member monthly ($12.99/mo)**.
- Naming is still `founding_*`, not `charter_*`.
- Env var naming is still aligned to `FOUNDING` / `STANDARD`, not `CHARTER` / `MEMBER_[YEARLY|MONTHLY]`.

### 2) Checkout + Stripe routing

**Checkout route:** `src/app/api/stripe/checkout/route.ts`
- Accepts a `plan` string typed as `PlanKey` from `src/lib/stripe.ts`
- Rejects unrecognized plans via `PLANS[plan]`
- Creates Stripe Checkout Session in `mode: 'subscription'`
- Allows promotion codes: `allow_promotion_codes: true`
- Error copy still instructs operator to set only:
  - `STRIPE_PRICE_ID_FOUNDING`
  - `STRIPE_PRICE_ID_STANDARD`

**Webhook route:** `src/app/api/stripe/webhook/route.ts`
- Persists `plan` and `stripe_price_id` from Stripe into `subscriptions`
- Resolves plans by matching Stripe price ID against `PLANS`
- This logic must be updated once new yearly/monthly/member/charter price IDs exist.

### 3) Subscription model / tier naming

**Subscription model:** `src/lib/subscription.ts`
- `plan` is stored as `string | null`
- Inline comment still documents only:
  - `'founding_annual' | 'standard_annual' | null`

**Current canonical plan keys found in repo:**
- `founding_annual`
- `standard_annual`

**Desired direction:**
- Replace `founding_annual` with a `charter_*` plan key
- Replace `standard_annual` naming with `member_annual`
- Add `member_monthly`
- Ensure downstream badge / success / checkout / webhook logic recognizes all three paid-plan identifiers

### 4) Tier-gating / billing logic

**Paid gating uses subscription status, not plan name:**
- `src/lib/subscription.ts` → `isActive()` checks `active` / `trialing`
- `src/app/calendar/page.tsx` redirects non-paid users to `/upgrade`
- `src/app/page.tsx`, `src/app/more/page.tsx`, `src/app/reading/page.tsx` use paid-vs-free access patterns

**Plan-name-dependent logic does exist in UI copy:**
- `src/app/page.tsx` member badge:
  - `founding_annual` → `Founding Member`
  - else → `Member`
- `src/app/upgrade/success/page.tsx`
  - special success message only for `founding_annual`

**Implications:**
- Access gating is mostly status-based and should survive renaming with modest changes.
- Plan-specific copy and labels will need direct updates.
- Monthly Member needs correct copy in success/account/billing flows.

### 5) UI copy using old pricing / old names

**Landing / sales page:** `src/components/LandingPage.tsx`
- Section label: `Founding members`
- Price shown: `$79 / year`
- CTA: `Become a founding member`
- Fine print: `Free to sign up. Upgrade when you're ready.`

**Upgrade page:** `src/app/upgrade/page.tsx`
- Card 1 title: `Founding Member`
- Card 1 price: `PLANS.founding_annual.price` → currently `$79`
- Card 1 CTA plan: `founding_annual`
- Card 2 title: `Member`
- Card 2 price: `PLANS.standard_annual.price` → `$99`
- Card 2 copy references `Everything in Founding Member`
- Fine print says only `Annual billing`
- No monthly Member option shown anywhere

**Home page badge:** `src/app/page.tsx`
- Displays `Founding Member` for `founding_annual`, otherwise `Member`

**Upgrade success page:** `src/app/upgrade/success/page.tsx`
- Founding-specific message:
  - `Your founding rate is locked in for life. This is the price you will pay for as long as SOS exists.`
- Non-founding message:
  - `Your annual membership is active. Everything is now unlocked.`
- No monthly-specific renewal/messaging path

**More/account page:** `src/app/more/page.tsx`
- Generic `Membership` link only
- No explicit tier naming or pricing copy here

**Cancel page:** `src/app/upgrade/cancel/page.tsx`
- Mentions free access, but no outdated paid-tier names/prices surfaced in audit

### 6) Onboarding / plan selector references

Audit result:
- No onboarding-specific plan selector or pricing selector was found in the current codebase.
- Relevant onboarding files under `src/components/onboarding/` and `src/app/onboarding/page.tsx` do not appear to expose paid plan choices.

**Implication:**
- The task request mentions onboarding plan selector, but current repo state appears not to have one. If sales flow expects onboarding pricing, that surface does not yet exist in this checkout implementation.

### 7) Email / lifecycle copy

Audit result:
- No dedicated email templates or lifecycle-email copy files were found in tracked source.
- Pricing/tier-adjacent text found was limited to UI strings such as:
  - `A receipt is on its way to your email.` in `src/app/upgrade/success/page.tsx`
- No Founding/Charter pricing email templates surfaced in repo grep.

**Implication:**
- There may be no in-repo lifecycle email copy to update.
- If pricing/tier names also live in an external transactional email provider, that work is outside this repo and should be manually checked.

### 8) Price / tier reference inventory

**`Founding` references**
- `src/lib/stripe.ts`
- `src/components/LandingPage.tsx`
- `src/app/page.tsx`
- `src/app/upgrade/page.tsx`
- `src/app/upgrade/success/page.tsx`
- `src/app/api/stripe/checkout/route.ts` (error text)
- `src/lib/subscription.ts` (comment)

**`$79` references**
- `src/components/LandingPage.tsx`
- `src/lib/stripe.ts` (as numeric `79`)

**`$99` references**
- `src/lib/stripe.ts` (as numeric `99`)
- `src/app/upgrade/page.tsx` via `PLANS.standard_annual.price`

**`$12.99` references**
- None found in current repo

**Stripe/env references**
- `src/lib/stripe.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/webhook/route.ts`

### 9) Validation / test harness state

`package.json` currently contains:
- `npm run lint`
- **No `typecheck` script**
- **No `test` script**

Audit also did **not** find tracked test files via the usual patterns (`__tests__`, `*.test.*`, `*.spec.*`) in this checked-out branch.

**Implication:**
- The requested validation commands cannot run as written in the current branch state without adding scripts or switching to a different branch/history slice.
- The infra map mentions an earlier verified test state, but this worktree at `main`/`41ff89b` does not expose that harness in the repository snapshot checked out here.

## Stripe-side implementation requirement for Charter limit

Locked requirement: **Charter Member = first 100 spots only**.

Because pricing enforcement must be real and not just UI copy, the recommended Stripe-side approach is:

1. Create a dedicated **Charter** product and annual recurring price at **$49/year USD**.
2. Restrict purchase of that Charter price with a **single promotion code or coupon strategy with a hard 100-redemption cap** *only if the app is designed to require that code to reach checkout*.
3. Preferably, enforce in app/webhook as well by checking the count of active + completed Charter subscriptions before exposing/allowing Charter checkout, because Stripe promotion-code limits alone do not fully model "first 100 locked forever" unless the app flow is built around that code gate.
4. Archive the legacy Founding product/price instead of deleting it, to preserve legacy subscribers.

**Important:** This environment could not implement or verify the Stripe-side enforcement because Stripe CLI/API access is unavailable here.

## Blocker details

### Blocking condition
- `stripe --version` failed with: `stripe: command not found`

### Consequence
Per task instructions:
- stop before Stripe API writes
- document what Analiesa needs to do manually
- do not guess or fabricate new Stripe IDs

## Manual steps Analiesa needs to take

### A. Install/auth Stripe CLI or perform in Stripe Dashboard
Either:
- install Stripe CLI and authenticate it for this workspace, or
- perform the following directly in the Stripe Dashboard

### B. Stripe objects to create/verify
1. **Member yearly**
   - Product: existing `Member` product (or canonical member product)
   - Price: recurring yearly
   - Amount: **$99.00 USD**
   - Capture resulting `price_...` ID

2. **Member monthly**
   - Product: same `Member` product
   - Price: recurring monthly
   - Amount: **$12.99 USD**
   - Capture resulting `price_...` ID

3. **Charter yearly**
   - Product: new `Charter` product (or rename/create as needed)
   - Price: recurring yearly
   - Amount: **$49.00 USD**
   - Capture resulting `price_...` ID

4. **Legacy Founding**
   - Keep legacy Founding product/price for existing customers
   - Archive old sellable Founding price/product instead of deleting

5. **100-seat Charter enforcement**
   - Choose and implement the actual Stripe-side enforcement mechanism
   - Minimum acceptable path: limited-redemption purchase gate with 100 cap
   - Better path: app/webhook count enforcement backed by Stripe subscription state

### C. Env vars the codebase will need once implementation resumes
Recommended target names (not yet implemented in code because work stopped before code changes):
- `STRIPE_PRICE_ID_CHARTER`
- `STRIPE_PRICE_ID_MEMBER_YEARLY`
- `STRIPE_PRICE_ID_MEMBER_MONTHLY`

### D. Vercel follow-up after IDs exist
- Add the new Stripe price env vars to Vercel Preview + Production
- Verify webhook handling still maps incoming price IDs to the correct internal plan keys
- Verify checkout flows for Charter yearly, Member yearly, and Member monthly

## Files changed in this run
- `/Users/beyond/.openclaw/workspace/sos-pricing-reconciliation-audit.md`
- `sos-pricing-reconciliation-audit.md` (repo mirror for commitability)

## Commits
- `e30ed19` — `docs: audit pricing reconciliation scope`
- current branch HEAD records the blocker/status update for this audit doc

## Test count delta
- Not run / not measurable in this branch state.
- Current branch snapshot does not expose a `test` script or visible tracked test harness, so no defensible before/after test-count claim can be made from this environment.

## Final defensible state
- Audit completed against the live SOS repo in an isolated worktree on `feat/pricing-reconciliation`
- No code changes were made to the app because required Stripe setup could not be executed from this environment
- No Stripe API writes were attempted
- Repository pricing is still in the pre-locked state (`Founding $79`, `Member $99 yearly only`, no monthly plan)
- Manual Stripe access is required before implementation can continue safely
