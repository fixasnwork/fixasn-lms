## Context

The project enforces one active non-admin session per account. On fresh sign-in (`auth.ts` jwt callback first block, `account && profile` present), the DB is rotated to `activeSessionVersion = nextSessionVersion` and `activeDeviceSecretHash` is cleared to `null`. A new JWT is minted with the version embedded.

After redirect, the client reaches the app and the `SessionProvider` `useEffect` calls `POST /api/auth/device-secret` to mint a fresh `fxns_state` HttpOnly cookie + DB hash. Until that sync completes, the user is in a **bootstrap window**: JWT valid, DB hash `null`, no `fxns_state` cookie.

`proxy.ts` already handles this window for navigation by allowing `missing-device-secret-hash` through and trusting the client to call the sync endpoint. `requireActiveSession` in `lib/routeAuth.ts` does **not** — every API request during the window returns 401 with `STALE_SESSION_MESSAGE`. The first SSR prefetch in `app/(user)/dashboard/page.tsx` (a Server Component doing `fetch()` to its own API) always loses the race, and any client query fired before the `useEffect` sync can also lose.

The user-visible symptom: every fresh login logs a 401 on `/api/users/me/dashboard` and `/api/videos` in the network tab. TanStack Query retries usually rescue the client, but the SSR prefetch throws silently and the error is observable.

## Goals / Non-Goals

**Goals:**
- Eliminate the 401 during the bootstrap window for the user who just signed in.
- Keep the strict checks (`missing-device-secret-cookie`, `invalid-device-secret`, `version-mismatch`, `missing-session-version`, `user-not-found`) intact — they all indicate a real violation, not a transient state.
- Document the bootstrap intent in code so a future refactor doesn't "tighten" it away.
- Add regression tests that pin the failure-reason taxonomy (what still rejects vs what now allows).

**Non-Goals:**
- Re-architecting the device-session flow (no new tables, no new endpoints, no async device-attestation).
- Modifying admin auth behavior (admins already skip the device-secret check entirely via `isAdminRole` early return).
- Changing public API contracts or response shapes.
- Backfilling the `activeDeviceSecretHash` column for users who never re-sync.

## Decisions

### 1. Bootstrap branch in `requireActiveSession` mirrors `proxy.ts`

Add the same `if (activeCheck.reason === 'missing-device-secret-hash') return { ok: true, session: activeSession };` branch the proxy already uses. Located after the `validateNonAdminActiveSession` call, before the generic 401 fallback.

**Rationale:** The bootstrap state is a defined transient (`activeSessionVersion` is set, `activeDeviceSecretHash` is `null` because the jwt callback just cleared it on sign-in). The jwt callback's second block already verifies the JWT version matches the DB version; we are not adding trust, we are honoring an existing trust decision. The device-secret endpoint will set the hash on first call and the window closes on its own.

**Alternatives considered:**
- *Only allow `missing-device-secret-hash` if `deviceSecret` cookie is absent (not just hash missing).* Rejected: would still require the cookie to be absent to bypass, defeating the purpose. The current branch is the right level of permissiveness.
- *Make the bootstrap window explicit in the JWT (e.g. add a `deviceSecretPending: true` claim).* Rejected: requires a second jwt callback change and a new invariant. Overkill for a transient that the DB state already encodes.
- *Add a `?bootstrap=1` query param that the SSR prefetch could pass.* Rejected: leaks internal state into URLs and requires the route handler to special-case query params.

### 2. Drop SSR prefetch in `app/(user)/dashboard/page.tsx`

Remove the `queryClient.prefetchQuery` block. The Server Component no longer calls `fetch()` to its own API.

**Rationale:** The SSR prefetch existed to populate TanStack Query's cache before hydration, so the first client render reads from dehydrated state instead of refetching. But (a) the prefetch always races the bootstrap window, (b) `useDashboardSummaryQuery` already has a 60s `staleTime` and `enabled: status === 'authenticated'`, and (c) the prefetch makes a full HTTP roundtrip to the same Node process — wasteful. Client-side fetch with a brief loading state is honest and removes one source of 401s.

**Alternatives considered:**
- *Keep prefetch, but call Prisma directly (skip the API route).* Tempting, but `useDashboardSummaryQuery` and the route handler would diverge over time. Two implementations of the same computation is worse than one.
- *Add `staleTime: Infinity` and rely on the prefetch.* Doesn't fix the bootstrap race.

### 3. Add explanatory comment in `routeAuth.ts`

Two lines above the new branch:
```ts
// Bootstrap exception: DB has no device secret hash yet (jwt callback cleared
// it on sign-in). Allow through; /api/auth/device-secret will mint it.
```

**Rationale:** Without the comment, the next reader will see "guard skips a check" and tighten it. The comment makes the intent unmistakable and references the recovery path.

### 4. Test taxonomy pins the failure-reason contract

Three new `it()` cases in `lib/routeAuth.test.ts`:
- Bootstrap (`missing-device-secret-hash` + matching version) → `{ ok: true }`.
- `missing-device-secret-cookie` (DB has hash, request lacks cookie) → 401 (regression guard against over-permissiveness).
- `invalid-device-secret` (hash mismatch) → 401 (regression guard).

**Rationale:** The bootstrap exception is a one-line code change with a wide security blast radius if misapplied. Tests must encode "exactly these reasons allow; everything else rejects."

## Risks / Trade-offs

- **[Risk] Future refactor removes the bootstrap branch and re-introduces the 401.** → Comment + tests. Both signal intent and fail loud on regression.
- **[Risk] Bootstrap exception is widened by mistake to `missing-device-secret-cookie` or `invalid-device-secret`.** → Tests pin the exact reason. Adding a new reason requires updating the test, which surfaces the decision.
- **[Risk] An attacker with a valid JWT can already mint a device secret via `/api/auth/device-secret`, so the bootstrap exception is not a new attack surface.** → Acceptable; this is the existing design. The exception only shortens a window that the attacker can already close themselves.
- **[Trade-off] Dropping the SSR prefetch means the first client render of `/dashboard` shows a brief skeleton instead of prefilled data.** → Acceptable; the prefetch was never reliable (race), and 60s `staleTime` on the client query means subsequent navigations are instant.

## Migration Plan

No schema change. No deploy sequencing. Single PR:
1. Edit `lib/routeAuth.ts` — add bootstrap branch + comment.
2. Edit `app/(user)/dashboard/page.tsx` — drop prefetch.
3. Edit `lib/routeAuth.test.ts` — add 3 cases.
4. Run `npm run test`, `npm run lint`, `npm run build`.
5. Deploy.

Rollback = revert the PR. No DB migration to undo.

## Open Questions

None. Oracle review (qwen3.7-plus) approved-with-changes; the two enhancements (comment + regression tests) are incorporated.
