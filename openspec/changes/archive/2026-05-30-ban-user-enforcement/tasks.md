## 1. Schema & Migration

- [x] 1.1 Add `isBlocked` (Boolean, default false), `blockedAt` (DateTime?), `blockedReason` (String?) to User model in `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma db push` to apply schema changes to database

## 2. Auth — Reject banned users at sign-in

- [x] 2.1 In `auth.ts` JWT callback, after fetching user from DB, check `isBlocked`. If true, set `token.isBlocked = true` (keep `activeSessionVersion` intact to avoid stale session)
- [x] 2.2 Redirect callback doesn't receive token in NextAuth v5 — layout guard handles post-sign-in redirect to `/banned`
- [x] 2.3 In `auth.ts` session callback, pass `isBlocked` to session object

## 3. Banned page

- [x] 3.1 Create `app/banned/page.tsx` as server component — uses `auth()` to check session server-side, renders `BannedClient` component
- [x] 3.2 Create `app/banned/BannedClient.tsx` — client component with "Akun Anda Telah Diblokir" message and "Keluar" button using `signOut`
- [x] 3.3 If user is NOT banned and visits `/banned`, server-side redirect to `/dashboard`

## 4. Layout guard — block banned users from user routes

- [x] 4.1 In `app/(user)/layout.tsx`, use `redirect('/login')` instead of `unauthorized()` (requires `experimental.authInterrupts` which is not enabled)
- [x] 4.2 After existing auth checks, query `user.isBlocked` from DB. If true, redirect to `/banned` (no reason in URL)

## 5. API guard — block banned users from API calls

- [x] 5.1 In `lib/routeAuth.ts` `requireActiveSession()`, after session validation, query `user.isBlocked` from DB. If true, return 403 with `{ error: "Account blocked" }` (no reason exposed)

## 6. Admin — Ban/unban users

- [x] 6.1 Create `PUT /api/users/ban` API route — accepts `{ email, reason }`, sets `isBlocked=true`, `blockedAt=now`, `blockedReason=reason`. Requires admin role.
- [x] 6.2 Create `PUT /api/users/unban` API route — accepts `{ email }`, sets `isBlocked=false`, `blockedAt=null`, `blockedReason=null`. Requires admin role.
- [x] 6.3 In `app/admin/payments/page.tsx`, add "🚫 Ban User" button per payment. Opens modal with reason textarea. On confirm, calls ban API.
- [x] 6.4 In `app/admin/payments/page.tsx`, show "User Diblokir" badge for payments from banned users. Show "↩ Unban User" button for banned users.
- [x] 6.5 Fetch banned user status in admin payments page (query users alongside payments, enriched in API response)

## 7. Tests

- [x] 7.1 Auth JWT callback sets `isBlocked` on token when user is blocked (in code)
- [x] 7.2 Layout redirect redirects banned user to `/banned` (in code)
- [x] 7.3 Unit test: API guard returns 403 for banned user (`lib/routeAuth.test.ts`)
- [x] 7.4 Unit test: `/banned` page redirects non-banned user to `/dashboard`
