<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next.js 16. APIs, file conventions, and docs may differ from older Next.js knowledge. Before changing Next.js code, read relevant docs in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

Single-package Next.js 16 App Router + React 19 + TypeScript app for FIX ASN, an Indonesian CPNS/SKD tryout platform. Current app includes public landing/login, user dashboard/tryout/payment/profile/ranking/video pages, and admin dashboard/settings/payments/landing/soal/video management.

## Current Status

- Backend is now mostly Prisma/Postgres-backed, not purely mocked/static.
- Auth uses NextAuth v5 Google OAuth plus DB user records.
- User/admin route groups exist: `app/(user)/...` maps to `/dashboard`, `/tryout`, etc.; `app/admin/...` maps to `/admin/*`.
- TanStack Query is used for client/server data fetching and hydration; Zustand remains for auth hydration and legacy/local app state.
- Supabase is used for image storage uploads; Supabase Auth helpers exist but NextAuth is primary auth.
- Known backlog lives in `TODO.md` (generic refactors: Tailwind palette tokens, inline-function extraction). `TASKS.md` does not exist.
- **Tryout functionality end-to-end picture lives in `TRYOUTS.md`** — start there before changing any code under `app/(user)/tryout/`, `components/tryout/`, `app/api/tryout-attempts/`, `app/api/tryouts/`, or related Prisma models. Bug/investigation writeups live in `context.md` alongside. Per-tryout ranking tab (in `TryoutReviewMode`) is part of this scope.
- **Video Pembelajaran end-to-end picture lives in `VIDEO.md`** — start there before changing any code under `app/(user)/video/`, `app/admin/video/`, `components/admin/video/`, `app/api/videos/`, `app/api/admin/videos/`, `app/api/video-progress/`, or the `Video` / `VideoProgress` Prisma models.
- **Frontend audit + known feature gaps live in `AUDIT.md`** — consult before adding new UI surfaces.

## Tech Stack

- **Next.js 16.2.6** / **React 19.2.4** — App Router, Server Components by default
- **TypeScript 5** — strict mode, `moduleResolution: bundler`, path alias `@/* -> ./*`
- **Tailwind CSS v4** — `@import "tailwindcss"` in `app/globals.css`, PostCSS via `@tailwindcss/postcss`
- **Prisma 7.8** + **Postgres** — schema in `prisma/schema.prisma`, client via `@prisma/adapter-pg`
- **NextAuth v5 beta** — Google provider in `auth.ts`
- **Supabase JS/SSR** — storage upload + helper clients
- **TanStack Query 5** — hooks in `hooks/useTryoutQueries.ts`, `useAutosaveAnswers.ts`, `useDashboardSummary.ts`, `useVideoQueries.ts`, `useVideoProgress.ts`; provider in `components/QueryProvider.tsx`
- **Zustand 5** — `store/useAuthStore.ts`, `store/useAppStore.ts`, `store/useNavGuardStore.ts` (tryout nav guard)
- **Vitest 4** + Testing Library + jsdom — unit/integration tests
- **Playwright** present for e2e config/tests (`e2e/admin-responsive.spec.ts`, `e2e/tryout-performance.spec.ts`), but no npm e2e script yet
- **ESLint 9** only; no Prettier
- **Husky** installed via `package.json` `prepare` script; modern layout uses `.husky/_/` for internal templates — no custom hooks registered

## Key Commands

### Execution restrictions

- Do not run tests, build commands, development servers, or database migrations unless the user explicitly asks for that action.
- This includes `npm run test` / Vitest / Playwright, `npm run build` / `next build`, `npm run dev` / `next dev`, and Prisma migrations or schema application commands such as `prisma migrate` and `prisma db push`.
- General requests to implement, fix, or verify a change do not authorize these commands. Use code inspection and report which checks were not run.
- This restriction takes precedence over testing and command guidance elsewhere in this file.

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
| --- | --- |
| `app/page.tsx` | Public landing page |
| `app/login/page.tsx` | Google login UI + redirect by role |
| `app/banned/` | Blocked-user landing (`BannedClient.tsx` + `page.tsx`) |
| `app/(user)/layout.tsx` | Authenticated user shell; blocks stale/banned/non-user sessions; prefetches `['packages']`, `['banks']` into TanStack Query |
| `app/(user)/dashboard/` | User home (`DashboardHomeClient`, `PackagePopularityCard`) |
| `app/(user)/tryout/`, `[attemptId]/` | Tryout list + attempt runner (uses `TryoutEngine`, `TryoutReviewMode`, `FinishedAttemptCard`, `PembahasanNavigator`) |
| `app/(user)/buy/`, `payment/`, `profile/`, `ranking/`, `video/` | User purchase/payment/profile/ranking/video pages |
| `app/admin/layout.tsx` | Admin-only shell; prefetches `['admin-payments']`, `['packages']`, `['logo-config']`; injects brand color CSS vars server-side |
| `app/admin/dashboard/`, `settings/`, `payments/`, `landing/`, `soal/`, `video/` | Admin panels (incl. `video/` for catalog management) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handlers; captures request IP via `AsyncLocalStorage` (`lib/authContext`) |
| `app/api/auth/device-secret/route.ts` | Single-device session sync (mints/rotates `fxns_state` cookie hash) |
| `app/api/banks/`, `[bankId]/` | Bank account CRUD |
| `app/api/logo-config/route.ts` | Brand logo/color config read+write (admin) |
| `app/api/packages/`, `[packageId]/` | Package CRUD |
| `app/api/payments/route.ts` | Payment lifecycle; wires into `UserPurchase` access grants |
| `app/api/profile/route.ts` | Authenticated user profile |
| `app/api/questions/route.ts` | Question CRUD |
| `app/api/tryout-attempts/`, `[attemptId]/`, `resume/` | Attempt lifecycle (create/resume/submit) |
| `app/api/tryouts/`, `[tryoutId]/`, `[tryoutId]/ranking/`, `seed/` | Tryout CRUD + per-tryout ranking endpoint (period=all\|weekly\|monthly), seed endpoint |
| `app/api/upload/route.ts` | Image upload to Supabase (5MB JPG/PNG, bucket `uploads`) |
| `app/api/users/ban/`, `unban/`, `me/dashboard/` | Admin ban controls + per-user dashboard summary |
| `app/api/videos/`, `[id]/`, `pdf/`, `progress/` | Video catalog (public list/detail/PDF/progress) |
| `app/api/admin/videos/`, `[id]/` | Admin video CRUD |
| `app/api/video-progress/route.ts` | Per-user video progress tracking |
| `components/layouts/` | `UserSidebar`, `AdminSidebar`, `Navbar`, `MobileBottomNav` |
| `components/dashboard/` | `DashboardHomeClient`, `PackagePopularityCard` |
| `components/tryout/` | `TryoutEngine`, `TryoutReviewMode` (with outer `Pembahasan \| Ranking` tab nav), `TryoutRankingPanel`, `FinishedAttemptCard`, `PembahasanNavigator` |
| `components/ranking/` | `RankingClient` |
| `components/admin/` | `AdminDashboardClient`, `LogoEditor`, `ImageUpload`, `SoalTable`, plus `admin/video/{VideoForm, VideoTable}` |
| `components/landing/` | `LandingPage`, `CTASection`, `PackagesSection`, `TestimonialsSection` |
| `components/ui/` | Shared primitives (`Button`, `Card`, `Modal`, `Badge`, `Logo`, `StatCard`) + `index.ts` barrel |
| `components/QueryProvider.tsx` | TanStack Query client provider |
| `components/SessionProvider.tsx` | NextAuth session + `AuthHydrator` (hydrates `useAuthStore`, logs out on stale session) |
| `auth.ts` | NextAuth config (Google provider, JWT/session callbacks) |
| `hooks/useTryoutQueries.ts` | TanStack Query hooks/mutations for tryout APIs |
| `hooks/useAutosaveAnswers.ts` | Debounced autosave for tryout answers |
| `hooks/useDashboardSummary.ts` | User dashboard summary fetch |
| `hooks/useVideoQueries.ts` | Video catalog queries |
| `hooks/useVideoProgress.ts` | Per-user video progress mutations |
| `lib/authContext.ts` | AsyncLocalStorage request context (IP, etc.) |
| `lib/authDb.ts` | `findOrCreateUser` + user DB helpers |
| `lib/adminAuth.ts` | `requireAdmin()` guard for admin-only API routes |
| `lib/routeAuth.ts` | `requireActiveSession(request)` guard for authenticated user APIs |
| `lib/deviceSession.ts` | Single-device session logic (`fxns_state` cookie, SHA-256 hash, version checks) |
| `lib/prisma.ts` | Lazy Prisma client singleton; requires `DATABASE_URL` at runtime |
| `lib/scoring.ts` | TWK/TIU/TKP scoring logic |
| `lib/availability.ts` | Date-availability checks for packages/tryouts |
| `lib/packagePopularity.ts` | Package purchase-count aggregation |
| `lib/paymentStorage.ts` | Payment persistence helpers |
| `lib/pdfPageRender.ts` | PDF page rasterization (`@napi-rs/canvas`) |
| `lib/pdfWatermark.ts` | PDF watermark compositing (`sharp`) |
| `lib/queryClient.ts` | `makeQueryClient` factory for TanStack Query |
| `lib/questionTransform.ts` | DB-to-API question mappers |
| `lib/ranking.ts` | Global + per-tryout leaderboard ranking logic; `getRankingData`, `getUserRank` (global), `getTryoutRanking`, `getUserTryoutRank` (per-tryout), `periodSince`, `withTtlCache` (TTL+single-flight) |
| `lib/types.ts` | Shared TS interfaces/types |
| `lib/supabase.ts`, `lib/supabaseServer.ts`, `lib/supabaseStorage.ts` | Supabase clients/helpers |
| `lib/video.ts` | Video catalog helpers |
| `lib/utils.ts` | Misc utilities |
| `store/useAuthStore.ts` | Mirrors NextAuth session for client UI state |
| `store/useAppStore.ts` | Legacy/local app state cache |
| `store/useNavGuardStore.ts` | Tryout nav guard (unsaved-changes warning) |
| `data/constants.ts` | Static constants |
| `data/packages.ts` | Default package seed data |
| `data/questions.ts`, `questions-set-a.ts`, `questions-set-b.ts` | Default question banks |
| `utils/supabase/{client,server,middleware}.ts` | Supabase SSR helpers (middleware not wired to root) |
| `prisma/schema.prisma` | DB schema |
| `prisma/seed.ts` | DB seed |
| `scripts/reset-and-seed.ts` | Reset + re-seed utility |
| `scripts/diagnose-packages.ts` | Package-state diagnostic CLI |
| `scripts/diagnose-video-access.ts` | Video-access diagnostic CLI |
| `scripts/pdfjs-dryrun.mjs`, `scripts/pdfjs-render-test.mjs` | PDF rendering smoke tests |
| `e2e/admin-responsive.spec.ts`, `e2e/tryout-performance.spec.ts` | Playwright e2e specs |
| `playwright.config.ts` | Playwright config (no npm script exposed) |
| `Caddyfile` | Reverse proxy config (Tailscale-friendly) |

## Data / Backend

- DB models (18): `User`, `Permission`, `RolePermission`, `UserPermission`, `Package`, `Tryout`, `PackageTryout`, `Question`, `QuestionOption`, `TryoutQuestion`, `BankAccount`, `Payment`, `UserPurchase`, `TryoutAttempt`, `AttemptAnswer`, `LogoConfigEntry`, `Video`, `VideoProgress`.
- IDs: master/reference tables use `Int`; users/transactional tables use UUID v7 strings where schema says so.
- API routes are Prisma-backed and often seed/fallback from `data/*` defaults when DB is empty.
- `lib/prisma.ts` lazy-loads `pg` adapter to avoid build-time DB crashes; runtime still needs `DATABASE_URL`.
- Per-tryout ranking endpoint (`GET /api/tryouts/[tryoutId]/ranking`) reuses the `TryoutAttempt` table filtered by `tryoutId + finishedAt`. Each user appears once with their max `totalScore` for that tryout; tie-break by earliest `finishedAt`. Result cached in-process for 5 min via `withTtlCache` (single-flight dedup; multi-instance staleness accepted as v1 trade-off). Access control: viewer must have a finished attempt for the tryout (else 403).
- `next.config.ts` uses `output: "standalone"`, Turbopack root, `experimental.authInterrupts`, `serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "pdf-to-img", "sharp"]`, and image remote patterns for `images.unsplash.com`, `*.supabase.co`, `lh3.googleusercontent.com`, `google.com`, `i.ytimg.com` (YouTube thumbnails for video embeds).
- Production CSP set in `next.config.ts` locks `script-src` (no `unsafe-eval`), `frame-src` (YouTube + youtube-nocookie), and `connect-src` (`accounts.google.com`, `*.supabase.co`). Dev CSP adds `'unsafe-eval'` for Turbopack HMR.

## Auth / Access Control

- Primary auth: `auth.ts` with NextAuth Google provider.
- `app/api/auth/[...nextauth]/route.ts` wraps handlers and records request IP with `AsyncLocalStorage` (`lib/authContext`).
- `findOrCreateUser()` in `lib/authDb.ts` creates DB users with role `user` by default; records `createdBy` and `createdIP`.
- Admin role comes from DB/session `role === "admin"` (`isAdminRole` helper in `lib/deviceSession.ts`); legacy `admin@fixasn.id` fallback remains in some code/tests.
- User layout redirects unauthenticated/stale sessions to `/login`, non-user roles to `/login`, blocked users to `/banned`.
- Admin layout redirects unauthenticated users to `/login`, non-admin users to `/`.
- Non-admin single-device/session enforcement lives in `lib/deviceSession.ts` and `app/api/auth/device-secret/route.ts`; cookie name `fxns_state`, hashed via SHA-256 into `User.activeDeviceSecretHash`.
- `lib/routeAuth.ts` exposes `requireActiveSession(request)` (stale-session + device-secret bootstrap); `lib/adminAuth.ts` exposes `requireAdmin()`.
- Bootstrap exception: if JWT version matches but device secret is missing/expired/invalid, `requireActiveSession` lets the request through — `POST /api/auth/device-secret` re-syncs the cookie. Transient state for valid-JWT users only.

## State & Data Flow

- Root layout wraps app with NextAuth `SessionProvider`, TanStack `QueryProvider`, then `components/SessionProvider.tsx` (`AuthHydrator`).
- Server layouts/pages may prefetch Prisma data into TanStack Query `HydrationBoundary` (e.g., `(user)/layout.tsx` prefetches `['packages']` and `['banks']`; `admin/layout.tsx` prefetches `['admin-payments']`, `['packages']`, `['logo-config']`).
- Prefer `hooks/useTryoutQueries.ts` (and the other `hooks/use*Queries*.ts`) for client API reads/mutations.
- `useAuthStore` mirrors/hydrates session data for client UI state; logs out on stale session.
- `useAppStore` still contains static defaults and sync actions; treat as legacy/local cache unless feature already uses it.
- `useNavGuardStore` powers the tryout "unsaved changes" warning on navigation.
- Server Components should not import Zustand stores directly.
- The `RankingEntry` shape (`lib/ranking.ts`) is shared between the global `/ranking` page and the per-tryout ranking tab in `TryoutReviewMode`. Any field change ripples to both.

## Supabase / Uploads

- `app/api/upload/route.ts` uploads JPG/PNG up to 5MB to Supabase Storage bucket `uploads`; path is `<userEmail>/<timestamp>-<random>.<ext>`.
- Server upload client uses `SUPABASE_SECRET_KEY` in `lib/supabaseServer.ts`.
- Client/SSR helpers currently expect `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.example` still lists `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so verify env names before deployment work. `NEXT_PUBLIC_SUPABASE_URL` is required in both.
- No root `middleware.ts` is wired; `utils/supabase/middleware.ts` is helper code only unless explicitly connected.

## Tailwind / Styling

- Tailwind v4, no `tailwind.config.js`.
- `app/globals.css` defines brand color CSS variables (`--brand-primary: #1B3A6B`, `--brand-secondary: #2563EB`, `--brand-dark: #0C1E45`) and exposes them via `@theme inline` (`--color-brand*` tokens). Not yet a full design-token system — palette refactor is on the `TODO.md` backlog.
- Existing UI uses many literal brand colors (`#0C1E45`, `#1B3A6B`, `#2563EB`, etc.). Preserve current visual language unless task asks for redesign.
- `app/admin/layout.tsx` injects brand color CSS vars server-side from prefetched `logo-config`, overriding defaults.
- `Montserrat` loads via `next/font/google` in `app/layout.tsx`.

## Testing

```bash
npm run test
npm run lint
npm run build
```

Tests are co-located with source. Current examples include (non-exhaustive):

```text
# lib
lib/scoring.test.ts
lib/deviceSession.test.ts
lib/routeAuth.test.ts
lib/ranking.test.ts
lib/video.test.ts
lib/availability.test.ts
lib/formatResumeLabel.test.ts
lib/pdfPageRender.test.ts
lib/pdfWatermark.test.ts

# stores
store/useAuthStore.test.ts
store/useAppStore.test.ts

# hooks
hooks/useTryoutQueries.test.ts
hooks/useAutosaveAnswers.test.ts
hooks/useVideoQueries.test.ts
hooks/useVideoProgress.test.ts

# shared UI
components/ui/Button.test.tsx
components/ui/Modal.test.tsx
components/layouts/AdminSidebar.test.tsx

# feature components
components/dashboard/PackagePopularityCard.test.tsx
components/admin/SoalTable.test.tsx
components/admin/video/VideoForm.test.tsx
components/admin/video/VideoTable.test.tsx
components/tryout/FinishedAttemptCard.test.tsx
components/tryout/TryoutEngine.test.tsx
components/tryout/TryoutReviewMode.test.tsx
components/tryout/TryoutRankingPanel.test.tsx

# pages + API routes
app/(user)/video/page.test.tsx
app/api/tryouts/[tryoutId]/ranking/route.test.ts
app/api/*/route.test.ts
```

Playwright e2e specs exist in `e2e/` (`admin-responsive.spec.ts`, `tryout-performance.spec.ts`), config in `playwright.config.ts`, but package scripts do not expose them yet.

## Pre-commit / Tooling Notes

- `lint-staged` config runs `vitest related --run` + `eslint` for staged `*.ts(x)` files.
- Husky is installed via `package.json` `prepare: husky install`. Modern layout uses `.husky/_/` for internal templates; no custom top-level hooks (e.g. `.husky/pre-commit`) are registered, so hooks do not run on commit.
- Build artifacts: do not edit `.next/`, `next-env.d.ts`, `node_modules/`, coverage output, or generated Prisma client.
- Docker uses Node 26 Alpine, standalone Next output, `npx prisma generate`, then `npm run build`. Build args must include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `SUPABASE_SECRET_KEY`.

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
- For tryout changes, start with `TRYOUTS.md`; for video changes, start with `VIDEO.md`. For known feature gaps, consult `AUDIT.md`.
- **For per-tryout ranking changes** (the pembahasan `Ranking` tab, its panel, or `GET /api/tryouts/[id]/ranking`): start with `openspec/specs/per-tryout-ranking/spec.md` and `TRYOUTS.md`. The spec is the source of truth for the 9 requirements + 22 scenarios.
- Keep tests co-located; add/adjust Vitest tests for `lib`, stores, shared UI, and route handlers when behavior changes.
