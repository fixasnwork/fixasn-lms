## 1. Bootstrap Exception in `requireActiveSession`

- [x] 1.1 In `lib/routeAuth.ts`, locate the `validateNonAdminActiveSession` call inside `requireActiveSession` (the block starting with `const activeCheck = await validateNonAdminActiveSession(...)`).
- [x] 1.2 Immediately after the `if (!activeCheck.ok) { ... }` rejection block, add the bootstrap branch:
  ```ts
  // Bootstrap exception: DB has no device secret hash yet (jwt callback
  // cleared it on sign-in). Allow through; /api/auth/device-secret will
  // mint the hash and set the fxns_state cookie on first call.
  if (!activeCheck.ok && activeCheck.reason === 'missing-device-secret-hash') {
    return { ok: true, session: activeSession };
  }
  ```
- [x] 1.3 Confirm the early return for `activeCheck.ok === true` (the existing happy path) is unchanged above the new branch.

## 2. Drop SSR Prefetch in Dashboard Page

- [x] 2.1 In `app/(user)/dashboard/page.tsx`, remove the `queryClient.prefetchQuery` block (the `await queryClient.prefetchQuery<DashboardSummary>(...)` call) and the `HydrationBoundary` wrapper that exists only to feed it.
- [x] 2.2 Remove now-unused imports: `dehydrate`, `HydrationBoundary` from `@tanstack/react-query`; `makeQueryClient` from `@/lib/queryClient`; `dashboardSummaryQueryKey` from `@/hooks/useDashboardSummary`; `DashboardSummary` from `@/lib/types`.
- [x] 2.3 Confirm the page still passes `userName` to `<DashboardHomeClient />` and that the component continues to call `useDashboardSummaryQuery` for its data.

## 3. Tests for Bootstrap Exception + Regression Guards

- [x] 3.1 In `lib/routeAuth.test.ts`, add a new `describe('requireActiveSession - bootstrap exception', ...)` block.
- [x] 3.2 Test case: `missing-device-secret-hash` with matching JWT version returns `{ ok: true }`. Mock `auth()` to return a session with `activeSessionVersion: 1`. Mock `prisma.user.findUnique` to return `{ isBlocked: false }` for the ban check, then `{ activeSessionVersion: 1, activeDeviceSecretHash: null }` for the active-session check. Assert `result.ok === true`.
- [x] 3.3 Test case: `missing-device-secret-cookie` (DB has hash, request has no cookie) still returns 401. Mock `prisma.user.findUnique` to return `{ activeSessionVersion: 1, activeDeviceSecretHash: 'some-hash' }` and the request cookies to be empty. Assert `result.ok === false` and `response.status === 401`.
- [x] 3.4 Test case: `invalid-device-secret` (cookie present, hash mismatch) still returns 401. Mock the DB to return one hash and the request cookie to carry a different secret. Assert 401.

## 4. Verification

- [x] 4.1 Run `npm run test -- lib/routeAuth.test.ts` and confirm all existing + new cases pass. (6/6 pass: 2 ban + 4 active-session validation.)
- [x] 4.2 Run `npm run test` (full suite) and confirm no regressions in `app/api/users/me/dashboard/route.test.ts`, `app/api/videos/route.test.ts`, `app/api/auth/device-secret/route.test.ts`, or `lib/deviceSession.test.ts`. (Pre-existing failures in `app/api/banks`, `app/api/questions`, `app/api/packages/[packageId]/tryouts`, `app/api/auth/route.test.ts`, and 2 e2e specs are unrelated to this change — verified by stashing and rerunning on base branch.)
- [x] 4.3 Run `npm run lint` and confirm no new warnings. (Clean.)
- [x] 4.4 Run `npm run build` and confirm the dashboard page builds without the prefetched data shape. (Build succeeds, all routes including `/dashboard` and `/api/users/me/dashboard` listed.)
