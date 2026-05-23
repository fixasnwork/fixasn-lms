## Context

The app uses NextAuth v5 with Google sign-in and JWT-based callbacks in `auth.ts`. The JWT callback already reads the Prisma `User` record on each token refresh so session data stays aligned with database-backed profile and role changes. Protected dashboard and admin routes use `auth()` in layouts and proxy middleware, while client state is hydrated from the NextAuth session through `components/SessionProvider.tsx` and `store/useAuthStore.ts`.

The current flow does not bind a login to a single active device. Any valid session cookie/JWT remains usable until it naturally expires, so the same paid non-admin account can stay active on multiple browsers or devices. If only a session/JWT cookie is copied to another device, the app also needs a separate server-validated random device secret so the copied session cookie alone is not enough.

## Goals / Non-Goals

**Goals:**

- Make the newest successful login the only active session for each non-admin user account.
- Invalidate older sessions consistently across protected pages, API routes, and client session hydration.
- Preserve the current Google provider and existing role-based routing rules.
- Store enough server-side state to revoke older JWT sessions without depending on client cooperation.
- Require a matching HttpOnly device secret cookie for non-admin sessions so copying only the NextAuth session/JWT cookie does not replay the active session.
- Keep stale-session handling user-friendly by signing out or redirecting stale clients with the Indonesian message: "Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan."

**Non-Goals:**

- Adding per-device management screens, device names, or user-controlled device revocation.
- Blocking the new login when another device is active.
- Applying the one-device rule to administrator accounts in the initial release.
- Supporting multiple concurrent active sessions for paid non-admin tiers unless explicitly added later.
- Reworking the subscription or payment entitlement model.

## Decisions

1. Track a server-side active session version on the `User` record.

   Add a nullable/initialized session marker such as `activeSessionVersion` and update it whenever a non-admin user completes a fresh sign-in. The JWT stores the marker present at sign-in time. On subsequent JWT/session validation, the callback compares the token marker with the current database marker; a mismatch marks the token as stale. Admin users are excluded from marker rotation and stale-marker rejection for the initial release.

   Rationale: the app already refreshes JWT data from Prisma in `auth.ts`, so this keeps the guardrail close to the existing auth source of truth. It avoids a full NextAuth database session adapter migration and works with the existing JWT-based setup.

   Alternative considered: store all sessions in a separate `UserSession` table. That supports device history and audit trails, but is more complex than required for one active device. A separate table can be introduced later if device management becomes a product requirement.

2. Pair the session marker with an HttpOnly device secret cookie.

   On fresh non-admin sign-in, generate a high-entropy random device secret, store only its hash on the user row, and set the raw secret in a secure HttpOnly cookie. Use a neutral cookie name that does not advertise authentication or authorization purpose, for example a generic application state key rather than `auth`, `session`, `token`, or `device`.

   A non-admin session is valid only when the JWT marker matches the active session marker and the neutral-named device secret cookie hashes to the stored active device secret hash.

   Rationale: this raises the bar for manual replay without logging users out on browser updates or network changes. Copying only the NextAuth session/JWT cookie will fail because the second device lacks the separate device secret cookie. Storing only the hash limits database exposure if user rows are leaked. The neutral cookie name is obfuscation only; the security boundary remains the random secret value, HttpOnly cookie flag, and server-side hash validation.

   Alternative considered: rely only on the active session marker. That blocks normal second-login sharing, but does not block the simpler copied-JWT path.

3. Rotate the active marker and device secret only on fresh sign-in.

   The marker and device secret are generated when the NextAuth `jwt` callback receives an `account` and `profile`, which indicates a provider sign-in. Routine session refreshes must compare against the stored marker and hashed device secret but must not rotate these values.

   Rationale: rotating during every request would invalidate the same device across tabs or concurrent requests. Fresh sign-in is the event that should replace the active device and its device secret.

   Alternative considered: rotate on every successful session check. This is unsafe because parallel requests from the same browser could race and stale each other.

4. Treat stale sessions as unauthenticated at the auth boundary.

   Stale tokens or sessions with missing/mismatched device secret cookies should not receive normal user session data. Server-side protected layouts, proxy checks, and authenticated API routes must reject them as unauthenticated or redirect to `/login`. Client hydration should clear the Zustand auth store, clear the device secret cookie through a server route, and trigger NextAuth sign-out or session refresh behavior when the session exposes a stale/invalid state.

   Fresh non-admin sign-in has one bootstrap exception: if the JWT marker matches the active session marker but the user row has no active device secret hash yet, the proxy may allow the first page navigation so the client can call the device-secret sync endpoint. Authenticated API routes still require a valid active session check; the sync endpoint is responsible for issuing the neutral HttpOnly cookie and storing its hash.

   Rationale: authorization must be enforced on the server, not only in the browser. Client-side logout is for user experience; server checks are the security boundary.

   Alternative considered: only call `signOut()` from the client when stale is detected. That leaves API routes and server-rendered protected pages exposed until the browser cooperates.

5. Keep role authorization separate from session freshness.

   The active-device check determines whether a non-admin session is valid. Existing role checks then decide whether the valid user can access admin or user routes. Admin sessions continue through the existing role-based flow without the one-device guardrail for now.

   Rationale: separating authentication freshness from authorization avoids mixing anti-sharing behavior with role routing and keeps admin/user behavior predictable.

6. Treat full-cookie replay as a remaining known limitation.

   If someone manually copies all relevant cookies, including both the NextAuth session cookie and the neutral-named device secret cookie, both browsers may present the same active credential pair. The server cannot distinguish them with marker and device-secret comparison alone because they are two copies of the same credential set.

   Rationale: the selected approach prevents normal multi-device login sharing and blocks the simpler "copy only the JWT/session cookie" path without relying on browser, OS, or network fingerprints. Preventing full-cookie replay requires stronger device attestation or risk checks, which can introduce false positives and should be considered separately if abuse persists.

## Risks / Trade-offs

- Database read on token/session refresh -> Continue using focused `select` queries and include only fields needed for session freshness and display data.
- Race between near-simultaneous logins -> Last committed login marker wins; older tokens become stale on next validation.
- Stale client may not immediately disappear while idle -> Enforce on next session refresh, navigation, or authenticated API request; optionally add a lightweight client refresh interval during implementation if current NextAuth polling is not sufficient.
- Copying only the NextAuth session/JWT cookie could otherwise replay the active session -> Require the matching device secret cookie and validate its hash server-side.
- Cookie name obfuscation can create false confidence -> Treat neutral naming as friction only; do not rely on the name as a security control.
- Copying all relevant cookies can still replay the active session -> Document as a remaining limitation and defer stricter device attestation or risk controls unless abuse persists.
- Existing sessions after deployment may not have a token marker -> Treat missing markers as stale after the first post-deployment login rotation, or initialize the database marker so users can sign in again cleanly.
- Existing sessions after deployment may not have a device secret cookie -> Treat missing device secret cookies as stale for non-admin users so they re-authenticate and receive a new device secret.
- Migration rollback can make issued tokens lack matching database state -> Roll back by removing the stale-session comparison before dropping the column.

## Migration Plan

1. Add active session marker and active device secret hash fields to the Prisma `User` model and database schema.
2. Generate or update the marker and random device secret on fresh non-admin sign-in; persist the marker and hashed secret on the user row; and set the raw secret in a neutral-named secure HttpOnly cookie.
3. Include the marker in the JWT token at sign-in and compare it with the database marker during token refresh/session creation.
4. Validate the device secret cookie hash alongside the JWT marker for non-admin sessions.
5. Update server auth helpers, protected layouts, proxy behavior, and API routes so stale non-admin sessions are rejected like unauthenticated sessions.
6. Update client session hydration so stale sessions clear local auth state, clear the device secret cookie through a server route, and redirect/sign out with the Indonesian stale-session message.
7. Add focused tests for marker rotation, device secret validation, stale-session rejection, and existing role routing.

## Open Questions

None.
