# SOS App Store / TestFlight Readiness Scaffold

Status: in progress
Last updated: 2026-04-28
Estimated TestFlight submission readiness: **35%**

## What this folder is

This folder contains App Store / TestFlight readiness scaffolding generated from the live SOS codebase at `/Users/beyond/SOS-App`.

These files are intentionally split into:
- what could be generated from the codebase now
- what still needs product/legal/design decisions
- what still needs a native iOS implementation layer before TestFlight/App Store submission is real

## Important repo reality discovered in audit

Two major blockers surfaced immediately:
1. **Current billing is web Stripe, not App Store IAP / StoreKit 2**
2. **There is no native iOS target / Xcode project / Info.plist / entitlements in the repo yet**

That means the app may be product-ready in many respects, but App Store readiness is still materially blocked by platform implementation work.

## File index

| File | Purpose | Status |
|---|---|---|
| `01-app-metadata-template.md` | App name, subtitle, promotional text, description, keywords, URLs, What’s New | scaffolded; needs pricing/product finalization |
| `02-privacy-nutrition-labels.md` | Code-audited data collection map + provisional App Store privacy answers | scaffolded; needs legal review |
| `03-screenshots-checklist.md` | Required screenshot sizes, capture set, subject list, process | scaffolded; needs designer + real captures |
| `04-review-notes-template.md` | Reviewer walkthrough, AI/wellness notes, rejection-risk guidance | scaffolded; needs real reviewer credentials + final review contact |
| `05-subscription-config-checklist.md` | Native subscription/IAP gap audit + configuration checklist | scaffolded; needs product + implementation decisions |
| `06-entitlement-and-capability-audit.md` | Native iOS capability audit (currently mostly missing) | scaffolded; needs native shell implementation |

## Biggest gaps before TestFlight

### Product/commercial
- finalize Free / Charter / Member behavior
- decide how to handle `first 100` for Charter on Apple platforms
- align pricing between request and current codebase

### App platform
- create or adopt a native iOS target/shell
- implement StoreKit 2 / App Store subscriptions
- define entitlement sync between Apple and backend

### Submission artifacts
- create privacy policy URL
- create support URL
- capture real screenshots from a real shipping container
- prepare seeded reviewer account(s)

## Current requested-vs-code mismatch called out in the audit

Requested target:
- Charter `$49/yr`
- Member `$99/yr` / `$12.99/mo`
- Free

Current code:
- Founding `$79/yr`
- Member `$99/yr`
- no monthly plan in code
- Stripe web checkout only

## Next 3 concrete steps

1. **Decide native subscription strategy**
   - Confirm whether Charter remains a literal first-100 product or becomes an App-Store-friendly launch offer.

2. **Create the iOS submission layer**
   - Add the native target/shell and decide whether SOS will ship iPhone-only or universal.

3. **Finish required submission surfaces**
   - Stand up live privacy/support URLs, seed reviewer accounts, and schedule screenshot capture from the actual shipping container.

## Notes

- Deliverables were written to this requested workspace folder.
- Matching copies were also mirrored into the repo under `docs/app-store-readiness/` so progress could be committed on the feature branch.
- No chart engine, Swiss Ephemeris, or encryption code was touched.
- No fake screenshots or fake reviewer credentials were generated.
