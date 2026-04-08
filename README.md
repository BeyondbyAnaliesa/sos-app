# SOS

This repo now holds two tracks:
- `getsos.app` waitlist web experience at the repo root (Next.js)
- SOS V1 product scaffold for mobile + API under npm workspaces

## Workspace layout

- `apps/mobile` - Expo app for auth, onboarding, and natal chart summary
- `apps/api` - Railway-ready Fastify API with PostgreSQL auth + onboarding endpoints
- `packages/shared` - shared Zod schemas and TS types
- `packages/chart-service` - Swiss Ephemeris natal chart generation via `sweph`
- `apps/api/sql/001_init.sql` - PostgreSQL + pgvector bootstrap schema

## Phase 0 + 1 delivered

- Email/password auth on API (`/auth/signup`, `/auth/login`)
- JWT session flow and `/me` profile endpoint
- Onboarding endpoint with birth data validation and Nominatim geocoding
- Swiss Ephemeris natal chart generation and persistence shape
- Expo mobile flow: sign up -> enter birth data -> chart summary

## Environment

Copy `.env.example` to `.env` and set:

- `SOS_DATABASE_URL`
- `SOS_JWT_SECRET`
- `SOS_API_BASE_URL`
- `SOS_MOBILE_API_URL` or `EXPO_PUBLIC_API_URL`

## Database bootstrap

Run the SQL in `apps/api/sql/001_init.sql` against PostgreSQL with pgvector enabled.

## Commands

```bash
npm install
npm run build
npm run typecheck
npm run build:api
npm run dev --workspace @sos/api
npm run start --workspace @sos/mobile
```

## Notes

The original Next waitlist app remains intact at the repo root. The product implementation is now scaffolded beside it so the waitlist can keep shipping while mobile/API work proceeds.
