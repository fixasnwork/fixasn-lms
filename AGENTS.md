<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next.js 16. APIs, file conventions, and docs may differ from older Next.js knowledge. Before changing Next.js code, read relevant docs in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

Single-package Next.js 16 App Router + React 19 + TypeScript app for FIX ASN, an Indonesian CPNS/SKD tryout platform. Current app includes public landing/login, user dashboard/tryout/payment/profile/ranking/video pages, and admin dashboard/settings/payments/landing/soal management.

## Current Status

- Backend is now mostly Prisma/Postgres-backed, not purely mocked/static.
- Auth uses NextAuth v5 Google OAuth plus DB user records.
- User/admin route groups exist: `app/(user)/...` maps to `/dashboard`, `/tryout`, etc.; `app/admin/...` maps to `/admin/*`.
- TanStack Query is used for client/server data fetching and hydration; Zustand remains for auth hydration and legacy/local app state.
- Supabase is used for image storage uploads; Supabase Auth helpers exist but NextAuth is primary auth.
- Known backlog lives in `TODO.md` / `TASKS.md` (date periods, hero photo upload, palette editor, package popularity card).

## Tech Stack

- **Next.js 16.2.6** / **React 19.2.4** — App Router, Server Components by default
- **TypeScript 5** — strict mode, `moduleResolution: bundler`, path alias `@/* -> ./*`
- **Tailwind CSS v4** — `@import "tailwindcss"` in `app/globals.css`, PostCSS via `@tailwindcss/postcss`
- **Prisma 7.8** + **Postgres** — schema in `prisma/schema.prisma`, client via `@prisma/adapter-pg`
- **NextAuth v5 beta** — Google provider in `auth.ts`
- **Supabase JS/SSR** — storage upload + helper clients
- **TanStack Query 5** — hooks in `hooks/useTryoutQueries.ts`, providers in `components/QueryProvider.tsx`
- **Zustand 5** — `store/useAuthStore.ts`, `store/useAppStore.ts`
- **Vitest 4** + Testing Library + jsdom — unit/integration tests
- **Playwright** present for e2e config/tests, but no npm e2e script yet
- **ESLint 9** only; no Prettier

## Key Commands

```bash
npm run dev           # dev server on :3000
npm run build         # production build
npm run start         # production server
npm run lint          # ESLint
npm run test          # Vitest once
npm run test:watch    # Vitest watch
npm run test:coverage # Vitest coverage
npx prisma generate   # generate Prisma client
npx prisma db push    # apply schema directly when no migration workflow requested
npx prisma migrate dev # create/apply migration when migration required
npx tsx prisma/seed.ts # seed DB
```

## Architecture

| Path | Purpose |
|---|---|
| `app/page.tsx` | Public landing page (`LandingPage`) |
| `app/login/page.tsx` | Google login UI + redirect by role |
| `app/(user)/layout.tsx` | Authenticated user shell; blocks stale/banned/non-user sessions; prefetches packages/banks |
| `app/(user)/dashboard/` | User home/dashboard |
| `app/(user)/tryout/` | Tryout list + attempt runner at `[attemptId]` |
| `app/(user)/buy/`, `payment/`, `profile/`, `ranking/`, `video/` | User purchase/payment/profile/ranking/video pages |
| `app/admin/layout.tsx` | Admin-only shell; prefetches payments/packages |
| `app/admin/dashboard/`, `settings/`, `payments/`, `landing/`, `soal/` | Admin panels |
| `app/api/**/route.ts` | Route Handlers for auth, packages, tryouts, questions, banks, payments, uploads, attempts, profile, bans |
| `components/layouts/` | User/admin sidebar and nav shells |
| `components/dashboard/`, `components/tryout/`, `components/ranking/` | Feature client components |
| `components/admin/` | Admin UI, logo editor, image upload, soal table |
| `components/landing/` | Landing page sections |
| `components/ui/` | Shared primitives (`Button`, `Card`, `Modal`, `Badge`, `Logo`, `StatCard`) |
| `hooks/useTryoutQueries.ts` | TanStack Query hooks/mutations for app APIs |
| `lib/scoring.ts` | TWK/TIU/TKP scoring logic |
| `lib/prisma.ts` | Lazy Prisma client singleton; requires `DATABASE_URL` at runtime |
| `lib/routeAuth.ts`, `lib/deviceSession.ts`, `lib/adminAuth.ts` | API auth/session guards |
| `lib/supabase*.ts`, `utils/supabase/*` | Supabase clients/helpers |
| `lib/types.ts` | Shared TS interfaces/types |
| `store/` | Zustand auth/app stores |
| `data/` | Static seed/default data (questions, packages, constants) |
| `prisma/schema.prisma` | DB schema |
| `prisma/seed.ts`, `scripts/reset-and-seed.ts` | Seed/reset utilities |

## Data / Backend

- DB models: `User`, `Permission`, `RolePermission`, `UserPermission`, `Package`, `Tryout`, `PackageTryout`, `Question`, `QuestionOption`, `TryoutQuestion`, `BankAccount`, `Payment`, `UserPurchase`, `TryoutAttempt`, `AttemptAnswer`, `LogoConfigEntry`.
- IDs: master/reference tables use `Int`; users/transactional tables use UUID v7 strings where schema says so.
- API routes are Prisma-backed and often seed/fallback from `data/*` defaults when DB is empty.
- `lib/prisma.ts` lazy-loads `pg` adapter to avoid build-time DB crashes; runtime still needs `DATABASE_URL`.
- `next.config.ts` uses `output: "standalone"`, Turbopack root, `experimental.authInterrupts`, and image remote patterns for Unsplash/Supabase/Google.

## Auth / Access Control

- Primary auth: `auth.ts` with NextAuth Google provider.
- `app/api/auth/[...nextauth]/route.ts` wraps handlers and records request IP with `AsyncLocalStorage`.
- `findOrCreateUser()` creates DB users with role `user` by default.
- Admin role comes from DB/session `role === "admin"` (legacy `admin@fixasn.id` fallback remains in some code/tests).
- User layout redirects unauthenticated/stale sessions to `/login`, non-user roles to `/login`, blocked users to `/banned`.
- Admin layout redirects unauthenticated users to `/login`, non-admin users to `/`.
- Non-admin single-device/session enforcement lives in `lib/deviceSession.ts` and `app/api/auth/device-secret/route.ts`.
- API guards: use `requireActiveSession(request)` for authenticated user APIs and `requireAdmin()` for admin-only APIs.

## State & Data Flow

- Root layout wraps app with NextAuth `SessionProvider`, TanStack `QueryProvider`, then `components/SessionProvider.tsx` (`AuthHydrator`).
- Server layouts/pages may prefetch Prisma data into TanStack Query `HydrationBoundary`.
- Prefer `hooks/useTryoutQueries.ts` for client API reads/mutations.
- `useAuthStore` mirrors/hydrates session data for client UI state.
- `useAppStore` still contains static defaults and sync actions; treat as legacy/local cache unless feature already uses it.
- Server Components should not import Zustand stores directly.

## Supabase / Uploads

- `app/api/upload/route.ts` uploads JPG/PNG up to 5MB to Supabase Storage bucket `uploads`.
- Server upload client uses `SUPABASE_SECRET_KEY` in `lib/supabaseServer.ts`.
- Client/SSR helpers currently expect `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.example` still lists `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so verify env names before deployment work.
- No root `middleware.ts` is wired; `utils/supabase/middleware.ts` is helper code only unless explicitly connected.

## Tailwind / Styling

- Tailwind v4, no `tailwind.config.js`.
- `app/globals.css` currently has global/reset/mobile utility CSS, not a full `@theme` token system.
- Existing UI uses many literal brand colors (`#0C1E45`, `#1B3A6B`, `#2563EB`, etc.). Preserve current visual language unless task asks for redesign.
- `Montserrat` loads via `next/font/google` in `app/layout.tsx`.

## Testing

```bash
npm run test
npm run lint
npm run build
```

Tests are co-located with source. Current examples include:

```text
lib/scoring.test.ts
lib/deviceSession.test.ts
lib/routeAuth.test.ts
store/useAuthStore.test.ts
store/useAppStore.test.ts
components/ui/Button.test.tsx
components/ui/Modal.test.tsx
components/admin/SoalTable.test.tsx
components/layouts/AdminSidebar.test.tsx
app/api/*/route.test.ts
```

Playwright e2e specs exist in `e2e/`, config in `playwright.config.ts`, but package scripts do not expose them yet.

## Pre-commit / Tooling Notes

- `lint-staged` config runs `vitest related --run` + `eslint` for staged `*.ts(x)` files.
- `.husky/pre-commit` is not currently present; do not assume hooks run locally.
- Build artifacts: do not edit `.next/`, `next-env.d.ts`, `node_modules/`, coverage output, or generated Prisma client.
- Docker uses Node 26 Alpine, standalone Next output, `npx prisma generate`, then `npm run build`.

## Implementation Guidelines

- Read relevant files first; avoid broad rewrites.
- For Next.js-specific changes, read `node_modules/next/dist/docs/` first.
- Prefer Server Components for data loading; add `'use client'` only for state/effects/browser APIs.
- Use Prisma in server code/API routes only; never import Prisma into client components.
- Use existing API response shapes and mappers; update tests when changing contracts.
- For authenticated APIs, preserve stale-session/device-secret behavior.
- For admin mutations, preserve `requireAdmin()` guard.
- For DB schema changes, update `prisma/schema.prisma`, related TS types, API mappers, hooks, UI forms, seed/default data if needed, and tests.
- For upload/image changes, validate MIME/size and Supabase env/bucket assumptions.
- Keep tests co-located; add/adjust Vitest tests for `lib`, stores, shared UI, and route handlers when behavior changes.
