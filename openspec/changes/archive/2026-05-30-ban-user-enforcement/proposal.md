## Why

Currently, "blocking" a user only marks individual **payments** as `blocked`. The user can still sign in, browse packages, and submit new payments. There is no way to ban a user from the platform entirely. Admins need the ability to ban users who abuse the system (e.g., fake payment proofs) so they cannot access any feature or sign in again.

## What Changes

- Add `isBlocked`, `blockedAt`, `blockedReason` fields to the `User` model in Prisma schema
- **BREAKING**: Banned users are rejected at sign-in (JWT callback checks `isBlocked` and throws)
- Banned users already signed in are kicked out on next request (layout guard + API guard check ban status)
- Show a clear "You are banned" notification page (no reason shown to user)
- Admin UI to ban/unban users from the payments page (user-level, not just payment-level)
- Admin UI shows banned user status across the app

## Capabilities

### New Capabilities
- `user-ban-enforcement`: Block banned users from signing in, accessing any route, or calling any API. Show generic ban notification (no reason).

### Modified Capabilities

(None — this is additive; existing payment-blocking behavior stays as-is.)

## Impact

- **Schema**: `prisma/schema.prisma` — add 3 columns to `User`, generate migration
- **Auth**: `auth.ts` JWT callback — reject banned users on sign-in
- **Layout**: `app/(user)/layout.tsx` — check ban status server-side
- **API guard**: `lib/routeAuth.ts` — check ban status in `requireActiveSession()`
- **Admin UI**: `app/admin/payments/page.tsx` — add ban/unban user buttons
- **New page**: Banned notification page (e.g., `/banned`)
- **Types**: `lib/types.ts` — extend User type if needed
