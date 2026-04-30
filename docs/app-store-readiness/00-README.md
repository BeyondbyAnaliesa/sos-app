# SOS App Store / TestFlight Readiness Scaffold

Status: in progress
Last updated: 2026-04-30
Estimated TestFlight submission readiness: **45%**

## What this folder is

This folder contains App Store / TestFlight readiness scaffolding generated from the live SOS codebase at `/Users/beyond/SOS-App`.

These files are intentionally split into:
- what could be generated from the codebase now
- what still needs product/legal/design decisions
- what still needs native iOS signing/archive validation and StoreKit/IAP work before TestFlight/App Store submission is real

## Important repo reality discovered in audit

Original audit blockers were:
1. **Current billing is web Stripe, not App Store IAP / StoreKit 2**
2. **No native iOS target / Xcode project / Info.plist / entitlements existed in the repo**

Current reality after 2026-04-30 Build work:
- first native iOS Capacitor scaffold now exists under `ios/App/`
- native iOS user-agent marker now hides web Stripe checkout in the native shell
- full Xcode/signing/archive validation is still blocked locally because only Command Line Tools are selected
- App Store-native subscriptions / StoreKit / entitlement sync are still unresolved

That means the app may be product-ready for controlled web/backend testers, but App Store readiness is still materially blocked by platform/account/monetization work.

## File index

| File | Purpose | Status |
|---|---|---|
| `01-app-metadata-template.md` | App name, subtitle, promotional text, description, keywords, URLs, What’s New | scaffolded; needs pricing/product finalization |
| `02-privacy-nutrition-labels.md` | Code-audited data collection map + provisional App Store privacy answers | scaffolded; needs legal review |
| `03-screenshots-checklist.md` | Required screenshot sizes, capture set, subject list, process | scaffolded; needs designer + real captures |
| `04-review-notes-template.md` | Reviewer walkthrough, AI/wellness notes, rejection-risk guidance | scaffolded; needs real reviewer credentials + final review contact |
| `05-subscription-config-checklist.md` | Native subscription/IAP gap audit + configuration checklist | scaffolded; needs product + implementation decisions |
| `06-entitlement-and-capability-audit.md` | Native iOS capability audit | updated; native scaffold exists, Xcode/signing/IAP still missing |
| `07-ios-capacitor-container.md` | Current native Capacitor shell status and validation commands | first scaffold committed; archive validation blocked on full Xcode |
| `08-testflight-owner-action-runbook.md` | Exact owner/system steps needed before first TestFlight archive | created; Xcode, Apple Developer, IAP, reviewer package still owner-blocked |

## Biggest gaps before TestFlight

### Product/commercial
- finalize Free / Charter / Member behavior
- decide how to handle `first 100` for Charter on Apple platforms
- align pricing between request and current codebase

### App platform
- validate the new native iOS target with full Xcode
- configure signing/team/bundle identifier in Apple Developer
- implement StoreKit 2 / App Store subscriptions, or keep paid purchases unavailable in native tester builds
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
- Charter `$49/yr`
- Member `$99/yr` / `$12.99/mo`
- Stripe web checkout only

## Next 3 concrete steps

1. **Decide native subscription strategy**
   - Confirm whether Charter remains a literal first-100 product or becomes an App-Store-friendly launch offer.

2. **Validate the iOS submission layer**
   - Select full Xcode, open/archive the Capacitor target, configure signing, and decide whether SOS ships iPhone-only or universal.

3. **Finish required submission surfaces**
   - Stand up live privacy/support URLs, seed reviewer accounts, and schedule screenshot capture from the actual shipping container.

## Notes

- Deliverables were written to this requested workspace folder.
- Matching copies were also mirrored into the repo under `docs/app-store-readiness/` so progress could be committed on the feature branch.
- No chart engine, Swiss Ephemeris, or encryption code was touched.
- No fake screenshots or fake reviewer credentials were generated.
