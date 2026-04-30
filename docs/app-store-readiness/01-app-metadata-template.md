# 01 — App Metadata Template

Status: updated after support/privacy routes
Last updated: 2026-04-30
Source of truth used: `/Users/beyond/SOS-App` code audit + product constraints in `/Users/beyond/.openclaw/workspace/USER.md`

## Positioning guardrails

- Keep SOS faceless. No founder story, face, personal narrative, quotes, or identity.
- Keep the register product-led and app-like, not coach/course/info-product.
- Do not assume astrology knowledge.
- Do not assume the user already journals.
- Avoid medical, mental-health-treatment, or financial outcome claims.

## Recommended App Store values

### App name
- Placeholder to confirm in App Store Connect: `SOS`
- Recommended value: `SOS`
- Alternate if `SOS` is unavailable: `SOS: Daily Guidance`

### Subtitle
- Placeholder to confirm: `[final subtitle]`
- Recommended value: `Chart-led daily guidance that learns you`
- Safer alternate: `Daily guidance from your chart and journal`

### Primary / secondary category
- Placeholder to confirm: `[final categories]`
- Recommended primary: `Lifestyle`
- Recommended secondary: `Health & Fitness`
- Why: current product is astrology + journaling + reflective guidance. Lifestyle is the safest top-level fit. Health & Fitness can support the journaling/wellness side without overclaiming treatment.

## Promotional text (170 characters max)

Recommended draft:

`Daily guidance from your natal chart and journal context. SOS calibrates to your life over time, so your readings get sharper the more you use it.`

Character check: within 170 chars.

Alternate shorter draft:

`Your chart, your transits, your journal context. SOS turns astrology into calm daily guidance that gets more personal over time.`

## Description template (4000 characters max)

Use this as the App Store long description draft.

---

SOS is a daily guidance app that reads your chart and your lived context together.

You add your birth data once. SOS calculates your natal chart with Swiss Ephemeris precision, tracks the transits affecting you now, and turns that into grounded daily guidance you can actually use.

This is not an astrology-learning app.
You do not need to know what a sextile is, memorize placements, or study your chart to get value from SOS. The chart math runs under the hood. What you see is the part that matters: clear, personal guidance for the day you are actually having.

What SOS includes:
- A natal chart generated from your birth data
- Daily transit-aware readings based on your actual chart
- A journal companion that responds in context
- A transit calendar for what is building over the month
- A system that gets more calibrated over time

What makes SOS different:
Most astrology apps read a chart in isolation. SOS is built to read your chart and your journal together.

The same transit can mean expansion for one person and rest for another. SOS uses journal context to calibrate its guidance to the life you are actually living, not just the sky in the abstract.

That means less doom, less generic horoscope language, and more calm precision.

Journaling is supported, not required.
If you like to write, SOS can reflect patterns back to you over time. If you do not think of yourself as a journaler, SOS still gives you daily readings and a place to check in when something real is happening.

Privacy and data handling:
- Account access is handled through secure authentication
- Subscription checkout is handled through Stripe in the current codebase
- Journal-derived context is intended to be protected as a core trust surface
- App Store privacy disclosures and policy language should be finalized against production data handling before submission

Current membership direction:
- Free access tier
- Charter annual plan
- Member annual or monthly plan

Use SOS if you want:
- Daily guidance without learning astrology
- A calmer alternative to anxiety-driven horoscope apps
- A journal companion that becomes more context-aware over time
- A tool that helps you notice patterns, timing, and what matters now

SOS does not provide medical, mental health, legal, or financial advice.

---

## Keywords (100 chars max)

Recommended keyword set:

`astrology,journal,daily guidance,transits,natal chart,horoscope,self reflection,ai companion`

Estimated total including commas: 99 chars.

## URLs

### Marketing URL
- Likely existing production root: `https://getsos.app`
- Evidence: `NEXT_PUBLIC_SITE_URL=https://getsos.app` in `.env.example`
- Status: likely exists, human verify live production page

### Support URL
- Route exists in repo: `src/app/support/page.tsx`
- Recommended App Store Connect value: `https://getsos.app/support`
- App-domain equivalent: `https://app.getsos.app/support`
- Status: implemented in repo; verify live after deploy

### Privacy Policy URL
- Route exists in repo: `src/app/privacy/page.tsx`
- Recommended App Store Connect value: `https://getsos.app/privacy`
- App-domain equivalent: `https://app.getsos.app/privacy`
- Status: implemented in repo; legal/product review still required before final filing

## What’s New template

### Initial release template
`SOS brings chart-based daily guidance, a context-aware journal companion, and a transit calendar into one app.`

### Ongoing release template
`This update includes [bug fixes / performance improvements / onboarding polish / subscription improvements]. Thanks for using SOS.`

### More product-specific template
`This update improves [daily reading accuracy / onboarding reliability / subscription flow / journal stability] and includes bug fixes across the app.`

## Codebase notes that affect final metadata

- Current in-repo web metadata says `SOS — Spiritual Operating System` with description `Your daily guidance, decoded from the cosmos.` (`src/app/layout.tsx`, `src/app/manifest.ts`).
- Current public pricing in code is now aligned to the requested web sales structure:
  - landing page shows `$49/year` Charter (`src/components/LandingPage.tsx`)
  - Stripe plan config has `charter_annual = 49`, `member_annual = 99`, and `member_monthly = 12.99` (`src/lib/stripe.ts`)
  - member yearly/monthly toggle exists on the upgrade screen
- Final App Store description should be updated only after pricing + IAP naming are finalized so metadata matches the product exactly.
