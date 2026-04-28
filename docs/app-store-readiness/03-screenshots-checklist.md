# 03 — Screenshots Checklist

Status: scaffolded; needs designer + real capture session
Last updated: 2026-04-28
Source: Apple App Store Connect screenshot specs page + current SOS UI audit

## Ground truth about the current product

Recommended screenshot subjects based on actual routed product surfaces in code:
- Home / state overview (`src/app/page.tsx`)
- Daily Reading (`src/app/reading/daily/page.tsx`)
- Natal Reading / chart (`src/app/reading/page.tsx`)
- Companion / journal chat (`src/app/journal/page.tsx`)
- Transit Calendar (`src/app/calendar/page.tsx`)
- Onboarding (`src/app/onboarding/page.tsx`)
- Membership / upgrade (`src/app/upgrade/page.tsx`) — optional if monetization needs a storefront shot

Do **not** fabricate screenshots. Use seeded demo accounts and real captured UI.

## Required screenshot sizes

Apple source used: App Store Connect Help → Screenshot specifications (fetched 2026-04-28)

### iPhone

| Display class | Accepted size(s) | Requirement note |
|---|---|---|
| 6.9" | 1320×2868, 1290×2796, or 1260×2736 portrait | Current primary iPhone upload bucket |
| 6.7" | No distinct current App Store Connect bucket found in Apple’s page; use as device capture/QA target only | Design QA only; final upload usually maps to 6.9" or 6.5" assets |
| 6.5" | 1284×2778 or 1242×2688 portrait | Required if 6.9" screenshots are not provided |
| 5.5" | 1242×2208 portrait | Optional fallback / legacy coverage; Apple can scale from newer sets in some cases |

### iPad

| Display class | Accepted size(s) | Requirement note |
|---|---|---|
| 13" | 2064×2752 or 2048×2732 portrait | Required if app runs on iPad |
| 12.9" | 2048×2732 portrait | Apple notes 12.9" can scale from 13" assets |

## Minimum capture set recommendation

If moving fast, capture this first:
1. iPhone 6.9" portrait set (6 screenshots)
2. iPad 13" portrait set (4–6 screenshots if iPad support remains enabled)
3. Optional legacy/export set for 6.5" / 5.5" only if needed by App Store Connect or design QA

## Recommended screenshot subjects

### Set order recommendation (iPhone)

1. **Home — daily state overview**
   - Show life wheel + top state text + navigation tiles
   - Goal: quickly communicate the app is a daily personal guidance product

2. **Daily Reading — today’s sky + active domains**
   - Show overview summary and 1–2 active guidance cards
   - Goal: communicate practical daily use, not astrology education

3. **Companion — journal conversation**
   - Show one believable journal entry and one grounded AI response
   - Goal: communicate the journal-calibration moat

4. **Natal Reading — your chart without teaching mode**
   - Show big-three reading or full-chart/member view depending monetization strategy
   - Goal: show depth without making the app feel like an astrology class

5. **Transit Calendar**
   - Show month view with signal density
   - Goal: communicate forward-looking planning utility

6. **Onboarding**
   - Prefer birth-data step or chart reveal step
   - Goal: show setup is clear and product-led

### Optional screenshot subjects

- Membership / upgrade screen if subscription value needs explicit support
- Feedback screen only if support responsiveness is part of launch narrative
- Success / post-purchase state only if storefront flow needs reinforcement

## Screenshot caption direction

Keep overlay copy extremely short. Suggested direction only:
- `Daily guidance that meets your real life`
- `Your chart, translated into what matters today`
- `A journal companion that remembers context`
- `See what’s building before it hits`
- `No astrology knowledge required`

Avoid:
- founder language
- first-person founder copy
- medical or therapeutic claims
- anything that sounds like a course, coaching offer, or astrology school

## Demo-data checklist before capture

Create a clean reviewer/demo account with:
- completed onboarding
- realistic birth data entered
- at least 3–5 journal entries so memory/context feels real
- one active paid account variant for calendar/full-chart captures
- one free-tier variant if showing locked surfaces

Seed capture content should avoid:
- private real user data
- any personal/founder identity references
- health-crisis copy
- claims that would trigger medical or safety review

## Capture process options

### Best path if a native iOS shell exists by capture time
1. Run the iOS build in Simulator.
2. Sign into a seeded demo account.
3. Use Simulator device classes that match the needed screenshot buckets.
4. Capture clean portrait screenshots with stable status bar and deterministic data.
5. Export into an organized folder by device class.

### Current repo reality
The audited repo does **not** contain an Xcode project or native iOS target. It is currently a Next.js app with PWA metadata and service worker support.

So today’s realistic capture paths are:

#### Path A — Web/PWA capture for design rehearsal
- Run the app locally or against preview/prod.
- Open in iOS Simulator Safari.
- Add to Home Screen if needed to preview standalone/PWA chrome.
- Capture screens manually.
- Use these only as rehearsal until the actual App Store submission container exists.

#### Path B — Native wrapper / shell capture after iOS target exists
- Once a real iOS target exists, re-capture inside that shipping container.
- This is the recommended final App Store path.

## File organization recommendation

```text
screenshots/
  iphone-6.9/
    01-home.png
    02-daily-reading.png
    03-companion.png
    04-natal-reading.png
    05-transit-calendar.png
    06-onboarding.png
  ipad-13/
    01-home.png
    02-daily-reading.png
    03-companion.png
    04-calendar.png
```

## Human-required follow-ups

- Confirm whether iPad support will be enabled for submission
- Confirm whether to show free-tier locked states or only unlocked paid experience
- Prepare seeded demo account(s)
- Decide final overlay copy + visual treatment
- Re-capture once the final iOS submission shell exists
