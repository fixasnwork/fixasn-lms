## Why

Users can currently keep the same non-admin account active across multiple devices, which allows one purchased subscription to be shared by several people at the same time. Enforcing one active device per non-admin account protects paid access while keeping the latest legitimate login usable.

## What Changes

- Add a guardrail that allows only one active device/session per non-admin user account at a time.
- When a non-admin user signs in on a new device or browser, that login becomes the active session for the account.
- Any older session for the same account must be treated as invalid and automatically logged out on its next authenticated interaction or session refresh.
- Add a server-validated random device secret cookie with a neutral cookie name so copying only the NextAuth session/JWT cookie is not enough to reuse a session on another device.
- Ensure protected user areas and authenticated APIs reject stale sessions consistently, not only client-side navigation.
- Require admin-only active-session authorization for payment status updates while preserving the existing payment creation flow.
- Keep administrator accounts excluded from the one-device rule in the initial release.
- Preserve the existing login provider and role-based authorization behavior while adding session-device validity checks.

## Capabilities

### New Capabilities

- `single-active-device`: Defines how the authentication system tracks the active session/device for each non-admin account, validates a neutral-named random device secret cookie, and invalidates older sessions when a newer login occurs.

### Modified Capabilities

None.

## Impact

- Authentication configuration in `auth.ts`, including NextAuth token/session callbacks.
- Database schema and migration files for tracking the current active session marker and active device secret hash per user.
- Server-side route/layout authorization checks under `app/dashboard/` and authenticated API routes under `app/api/`.
- Client session hydration and logout behavior in `components/SessionProvider.tsx` and `store/useAuthStore.ts`.
- Cookie handling for issuing, validating, and clearing the neutral-named HttpOnly device secret cookie.
- Tests for login/session replacement, device secret validation, stale-session rejection, admin exclusion, and protected-route authorization behavior.
