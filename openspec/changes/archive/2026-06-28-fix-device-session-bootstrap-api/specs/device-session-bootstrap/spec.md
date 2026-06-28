## ADDED Requirements

### Requirement: Non-Admin API Guard Allows Bootstrap Window
The `requireActiveSession()` function in `lib/routeAuth.ts` MUST allow a non-admin request through when the JWT version matches the database `activeSessionVersion` and the database `activeDeviceSecretHash` is `null`. The function MUST return `{ ok: true, session }` in that case so that the client can reach the `POST /api/auth/device-secret` sync endpoint and close the bootstrap window on its own.

#### Scenario: Fresh sign-in hits API before device-secret sync
- **WHEN** a non-admin user has just signed in (JWT version matches DB, DB hash is `null`) and the client calls any API route guarded by `requireActiveSession` before the `fxns_state` cookie has been set
- **THEN** the guard returns `{ ok: true, session }` and the route handler proceeds normally
- **AND** the response does NOT include `Set-Cookie` for `fxns_state` (that is the device-secret endpoint's job)

#### Scenario: Database hash exists but cookie is missing
- **WHEN** a non-admin user makes a request and the database has an `activeDeviceSecretHash` but the request does not include the `fxns_state` cookie
- **THEN** the guard MUST return HTTP 401 with the stale-session message
- **AND** the response MUST clear the `fxns_state` cookie

#### Scenario: Cookie present but hash does not match
- **WHEN** a non-admin user makes a request with a `fxns_state` cookie whose SHA-256 hash does not equal the database `activeDeviceSecretHash`
- **THEN** the guard MUST return HTTP 401 with the stale-session message
- **AND** the response MUST clear the `fxns_state` cookie

#### Scenario: JWT version does not match database version
- **WHEN** a non-admin user makes a request and the JWT's `activeSessionVersion` does not equal the database `activeSessionVersion`
- **THEN** the guard MUST return HTTP 401 with the stale-session message regardless of `fxns_state` cookie state

#### Scenario: Admin user bypasses the bootstrap check
- **WHEN** the session role is `"admin"`
- **THEN** the guard returns `{ ok: true, session }` without calling `validateNonAdminActiveSession` (admins are exempt from the device-secret system)

### Requirement: Dashboard Page Does Not SSR-Prefetch Its Own API
The `app/(user)/dashboard/page.tsx` Server Component MUST NOT issue a `fetch()` to `/api/users/me/dashboard` (or any other internal API route) during server rendering. Hydrated client data MUST be sourced exclusively from TanStack Query hooks (`useDashboardSummaryQuery`).

#### Scenario: Dashboard renders without SSR prefetch
- **WHEN** a non-admin user navigates to `/dashboard`
- **THEN** the Server Component renders the page shell and `<DashboardHomeClient />` without making a server-side `fetch()` to any `/api/*` route
- **AND** the client component fetches the dashboard summary via `useDashboardSummaryQuery` after hydration

#### Scenario: First dashboard render after fresh sign-in does not 401
- **WHEN** a non-admin user signs in and lands on `/dashboard` for the first time
- **THEN** the network tab shows no 401 response for `/api/users/me/dashboard` originating from the server prefetch
- **AND** the client query either succeeds immediately (if the device-secret sync has completed) or is allowed through by the bootstrap exception

### Requirement: Bootstrap Exception Is Documented In Code
The `requireActiveSession()` function in `lib/routeAuth.ts` MUST include an inline comment explaining the bootstrap exception's purpose, the transient state it handles, and the recovery path (`POST /api/auth/device-secret`).

#### Scenario: Future refactor preserves the intent
- **WHEN** a developer reads the bootstrap branch in `requireActiveSession`
- **THEN** the comment makes clear that the branch exists for the post-sign-in transient state and is not a "skip the check" shortcut
- **AND** removing the branch should require also updating the test suite, which fails if the failure-reason contract changes
