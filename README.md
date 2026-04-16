# SOS — Spiritual Operating System

An intelligent daily guidance app that reads your natal chart against current planetary transits and surfaces three practical insights: one for relationships, one for work, one for personal growth.

## v0 Status

This is a UI prototype using **mock data only**. A real astrology engine exists and will be wired in after the guidance UX is validated.

## Where Things Live

| What | File |
|------|------|
| Mock natal chart | `src/data/natal-chart.ts` |
| Mock daily transits | `src/data/transits.ts` |
| Interpretation function | `src/lib/interpret.ts` |
| Guidance card component | `src/components/GuidanceCard.tsx` |
| App header | `src/components/Header.tsx` |

**To swap in real data:** replace `mockNatalChart` and `mockTransits`, then update the `GUIDANCE` lookup in `interpret.ts` (or replace `interpretTransits` entirely with real engine output).

## Running the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
