## Context

The app uses NextAuth with Google sign-in. Users are stored in PostgreSQL via Prisma. The `User` model has `role` (default "user"), `deletedAt` (soft delete), but no ban fields. Currently, admins can only block individual *payments* — the user remains active and can create new payments.

The auth flow: Google sign-in → JWT callback (`auth.ts`) fetches/creates user in DB → session exposes role. The `(user)/layout.tsx` guards routes by checking `role === 'user'`. API routes use `requireActiveSession()` from `lib/routeAuth.ts`.

## Goals / Non-Goals

**Goals:**
- Banned users cannot sign in (rejected at JWT callback)
- Banned users already signed in are kicked out on next page load or API call
- Banned users see a generic "You are banned" message (reason NOT shown to user)
- Admins can ban/unban users from the payments page
- Ban is at the **user level**, not payment level

**Non-Goals:**
- Temporary bans / suspension with expiry (future enhancement)
- Ban appeals workflow
- Ban reason templates
- Bulk ban operations
- IP-based bans

## Decisions

### 1. Add `isBlocked`, `blockedAt`, `blockedReason` to User model

**Why**: Clean, explicit fields. `isBlocked` is a boolean for fast checks. `blockedAt` for audit trail. `blockedReason` for display to admin only (never exposed to user).

**Alternative considered**: Reuse `deletedAt` (soft delete) as ban signal. **Rejected**: soft delete and ban are different concepts. A deleted user is removed; a banned user is blocked but their data stays visible to admins.

### 2. Check ban status in JWT callback (auth.ts)

**Why**: Earliest interception point. Sets `token.isBlocked = true` so the session carries the flag.

**Implementation**: In the JWT callback, after fetching user from DB, check `isBlocked`. If true, set `token.isBlocked = true` and return early. **Keep `activeSessionVersion` intact** — deleting it causes stale session issues that redirect to login before the ban page renders.

**Alternative**: Check in layout only. **Rejected**: banned user would still get a full session, just be redirected. Wastes resources.

### 3. Dedicated `/banned` page for notification

**Why**: Clean separation. The layout redirect sends banned users to `/banned` which shows a generic ban message. Ban reason is stored in DB for admin visibility only — never exposed to the user.

**Implementation**: `app/banned/page.tsx` is a **server component** that calls `auth()` server-side. If session is valid and `isBlocked`, renders `BannedClient.tsx` (client component with sign-out button). If not banned, redirects to `/dashboard`.

**Why server component?**: Using `useSession()` on the banned page caused a redirect loop — NextAuth's client-side session handling invalidated the session when `activeSessionVersion` was missing, redirecting to `/login` before the ban message could render.

### 4. Use `redirect()` instead of `unauthorized()`/`forbidden()`

**Why**: `unauthorized()` and `forbidden()` are experimental in Next.js 16 and require `experimental.authInterrupts` to be enabled. Using `redirect('/login')` and `redirect('/')` achieves the same result without the experimental flag.

### 5. Admin ban from payments page

**Why**: The payments page is where admins already manage user issues. Adding a "Ban User" button next to blocked payments is the natural place.

**Implementation**: New API endpoints `PUT /api/users/ban` and `PUT /api/users/unban`. Admin selects a user, provides a reason (stored in DB for admin records), and the user's `isBlocked` is set to true. The reason is NEVER sent to the banned user.

## Risks / Trade-offs

- **[Risk]** Banned user with active session tries to access app → **Mitigation**: Layout and API guards check `isBlocked` on every request and redirect to `/banned`
- **[Risk]** Admin bans wrong user → **Mitigation**: Confirmation modal with reason required (stored in DB only); unban button available
- **[Risk]** Race condition: user banned mid-session → **Mitigation**: DB check on every request (not just at sign-in)
- **[Trade-off]** No temporary bans → simpler implementation; can add later if needed

## Migration Plan

1. Add columns to User model (`isBlocked`, `blockedAt`, `blockedReason`) — nullable, default false/null
2. Run `npx prisma db push` to apply schema changes
3. Deploy code changes (auth, layout, API guards, admin UI)
4. No data migration needed — existing users have `isBlocked = false` by default
