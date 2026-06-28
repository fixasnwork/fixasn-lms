## Why

The single-active-device enforcement (`lib/routeAuth.ts::requireActiveSession`) rejects every authenticated API request with HTTP 401 + "Akun Anda telah masuk di perangkat lain" during the bootstrap window between a fresh non-admin sign-in and the first client-side `syncDeviceSecret()` call. The bootstrap exception that already exists in `proxy.ts:55-61` is missing from the API guard, so the first SSR prefetch and any racing client query (e.g. `useDashboardSummaryQuery`, `useUserVideos`) fail before the device secret is ever minted. The design doc explicitly intended a bootstrap exception at the auth boundary; the API simply inherited the strict check.

## What Changes

- Add a bootstrap exception to `requireActiveSession` in `lib/routeAuth.ts`: if `validateNonAdminActiveSession` returns `missing-device-secret-hash` and the JWT version matches, allow the request through. The device-secret endpoint will mint the hash and set the cookie on first call.
- Drop the SSR prefetch in `app/(user)/dashboard/page.tsx`. The Server Component was issuing a `fetch()` to its own API route, which always races (or runs before) the client-side device-secret sync. The client `useQuery` already handles the data load.
- Add a `// Bootstrap exception` comment in `routeAuth.ts` so the intent is explicit and resistant to future "tighten this" refactors.
- Add tests in `lib/routeAuth.test.ts` covering:
  - `missing-device-secret-hash` with matching JWT version → `{ ok: true }` (bootstrap path)
  - `missing-device-secret-cookie` (DB has hash, request lacks cookie) → still 401 (regression guard)
  - `invalid-device-secret` (hash mismatch) → still 401 (regression guard)

## Capabilities

### New Capabilities

- `device-session-bootstrap`: defines the auth-boundary bootstrap window for fresh non-admin sign-ins and which guards must allow it through.

### Modified Capabilities

_None._ This change does not alter any spec-level behavior already declared in `openspec/specs/`. The device-session contract was previously documented only in the archived `single-active-device` change. We surface it as a new capability instead of mutating unrelated specs (e.g. `user-dashboard-summary`, `user-ban-enforcement`) that merely reference `requireActiveSession`.

## Impact

- `lib/routeAuth.ts` — add bootstrap branch, comment.
- `app/(user)/dashboard/page.tsx` — remove `prefetchQuery` SSR fetch and the now-unused `dashboardSummaryQueryKey` / `DashboardSummary` imports.
- `lib/routeAuth.test.ts` — add three new `it()` cases.
- No DB schema change. No new API contract. No public surface change.
- No security regression: the attacker who already holds a valid JWT can mint a new device secret via `/api/auth/device-secret` today; the bootstrap exception does not widen that surface.
