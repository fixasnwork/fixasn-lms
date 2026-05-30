## ADDED Requirements

### Requirement: User model has ban fields
The `User` model in Prisma schema SHALL have the following fields:
- `isBlocked`: Boolean, default `false`
- `blockedAt`: DateTime (nullable)
- `blockedReason`: String (nullable)

#### Scenario: New user is not blocked
- **WHEN** a new user is created
- **THEN** `isBlocked` is `false`, `blockedAt` is `null`, `blockedReason` is `null`

### Requirement: Banned users cannot sign in
The auth system SHALL reject banned users at sign-in. The JWT callback in `auth.ts` MUST check `isBlocked` after fetching the user from the database.

#### Scenario: Banned user tries to sign in
- **WHEN** a user with `isBlocked = true` attempts Google sign-in
- **THEN** the sign-in succeeds but `token.isBlocked = true` is set on the session
- **AND** the user is redirected to `/dashboard` which triggers the layout ban check → `/banned`

#### Scenario: Non-banned user signs in normally
- **WHEN** a user with `isBlocked = false` attempts Google sign-in
- **THEN** sign-in proceeds normally

### Requirement: Banned users cannot access user routes
The `(user)/layout.tsx` server component SHALL check `isBlocked` on every request. If the user is banned, it MUST redirect to `/banned`.

#### Scenario: Banned user with active session visits a protected route
- **WHEN** a banned user (session still valid) navigates to `/tryout`, `/buy`, `/dashboard`, or any user route
- **THEN** they are redirected to `/banned`

#### Scenario: Non-banned user accesses protected route
- **WHEN** a non-banned user navigates to a protected route
- **THEN** the route loads normally

### Requirement: Layout uses redirect() not unauthorized()
The layout guards SHALL use `redirect('/login')` and `redirect('/')` instead of `unauthorized()` and `forbidden()`, which require the experimental `authInterrupts` flag.

#### Scenario: Unauthenticated user accesses protected route
- **WHEN** a user without a session navigates to `/dashboard` or any user route
- **THEN** they are redirected to `/login` via `redirect('/login')`

#### Scenario: Non-user role accesses user route
- **WHEN** an admin navigates to `/dashboard`
- **THEN** they are redirected to `/login` via `redirect('/login')`

### Requirement: Banned users cannot call user APIs
The `requireActiveSession()` function in `lib/routeAuth.ts` SHALL check `isBlocked` after validating the session. If banned, it MUST return 403 with a ban message.

#### Scenario: Banned user calls a protected API
- **WHEN** a banned user makes a request to any API route guarded by `requireActiveSession()`
- **THEN** the API returns `403 Forbidden` with `{ error: "Account blocked" }`

#### Scenario: Non-banned user calls a protected API
- **WHEN** a non-banned user makes a request to a protected API
- **THEN** the API processes the request normally

### Requirement: Banned page shows generic ban message
A `/banned` page SHALL exist as a **server component** that:
- Calls `auth()` server-side to verify the session
- Renders `BannedClient.tsx` (client component) with sign-out button
- Shows a generic "Akun Anda Telah Diblokir" message (no reason)
- The ban reason is NOT shown to the user (stored in DB for admin only)

#### Scenario: Banned user lands on /banned page
- **WHEN** a banned user is redirected to `/banned`
- **THEN** the page displays "Akun Anda Telah Diblokir" with a "Keluar" button

#### Scenario: Non-banned user visits /banned directly
- **WHEN** a non-banned user manually navigates to `/banned`
- **THEN** they are redirected to `/dashboard` via server-side `redirect()`

### Requirement: Admin can ban a user
The admin payments page SHALL have a "Ban User" button for each user. Clicking it opens a confirmation modal requiring a reason. On confirm, the API sets `isBlocked = true`, `blockedAt = now()`, `blockedReason = <reason>`.

#### Scenario: Admin bans a user from payments page
- **WHEN** admin clicks "Ban User" on a payment, enters reason "Fake proof", and confirms
- **THEN** the user's `isBlocked` becomes `true`, `blockedAt` is set, `blockedReason` is "Fake proof" (stored in DB only)

#### Scenario: Admin tries to ban without reason
- **WHEN** admin clicks "Ban User" but leaves the reason empty
- **THEN** the confirm button is disabled

### Requirement: Admin can unban a user
The admin payments page SHALL show an "Unban User" button for banned users. Clicking it resets `isBlocked = false`, `blockedAt = null`, `blockedReason = null`.

#### Scenario: Admin unbans a user
- **WHEN** admin clicks "Unban User" and confirms
- **THEN** the user's `isBlocked` becomes `false`, `blockedAt` and `blockedReason` are cleared

### Requirement: Admin sees banned status in payments list
The admin payments page SHALL visually indicate when a user is banned (e.g., red badge "User Diblokir").

#### Scenario: Payment from banned user
- **WHEN** admin views the payments list
- **THEN** payments from banned users show a red "🚫 User Diblokir" badge
- **AND** the ban reason is visible to the admin only
