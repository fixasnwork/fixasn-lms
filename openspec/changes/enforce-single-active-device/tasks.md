## 1. Data Model

- [x] 1.1 Add active session marker and active device secret hash fields to the Prisma `User` model.
- [x] 1.2 Add a database migration or schema update script that initializes the active session marker and device secret hash fields safely for existing users.
- [x] 1.3 Regenerate Prisma client artifacts if required by the project workflow.

## 2. Authentication Flow

- [x] 2.1 Update fresh Google sign-in handling in `auth.ts` to rotate the active session marker and active device secret only for non-admin users.
- [x] 2.2 Store the active session marker in the JWT when a fresh non-admin sign-in succeeds.
- [x] 2.3 Generate a high-entropy random device secret on fresh non-admin sign-in, store only its hash, and set the raw value in a neutral-named secure HttpOnly cookie.
- [x] 2.4 Compare the JWT marker with the current database marker during non-admin token/session refresh.
- [x] 2.5 Validate the device secret cookie against the current database hash during non-admin token/session refresh.
- [x] 2.6 Mark mismatched or missing non-admin session markers or device secrets as stale without rotating values during normal refreshes.
- [x] 2.7 Preserve existing admin session behavior without applying the one-device rule or requiring the device secret cookie.

## 3. Authorization Boundaries

- [x] 3.1 Ensure protected dashboard layouts treat stale non-admin sessions as unauthenticated.
- [x] 3.2 Ensure proxy route protection redirects stale sessions to the login flow.
- [x] 3.3 Ensure authenticated API routes reject stale sessions and missing/mismatched device secret cookies before returning protected user, profile, upload, payment, or tryout data.
- [x] 3.4 Preserve existing admin/user role checks after active-session validation passes.
- [x] 3.5 Require active admin session for payment status updates while preserving payment creation behavior.

## 4. Client Session Handling

- [x] 4.1 Update session hydration so missing, stale, or invalid sessions clear `useAuthStore`.
- [x] 4.2 Trigger a clean sign-out or login redirect with the message "Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan." when the browser detects that its session was replaced by another login.
- [x] 4.3 Clear the device secret cookie through a server route or response when a stale session is logged out.
- [x] 4.4 Confirm authenticated navigation state updates correctly after stale-session logout.
- [x] 4.5 Allow fresh-login device-secret bootstrap without redirecting `/login?reason=device-replaced` into a loop.

## 5. Tests and Verification

- [x] 5.1 Add tests proving a second non-admin login replaces the first active session for the same account.
- [x] 5.2 Add tests proving a copied active session/JWT without the device secret cookie is rejected.
- [x] 5.3 Add tests proving stale sessions are rejected for protected pages or auth helpers.
- [x] 5.4 Add tests proving protected API routes do not return data for stale sessions or missing/mismatched device secrets.
- [x] 5.5 Add tests proving valid active sessions still follow existing role authorization behavior.
- [x] 5.6 Add tests proving admin sessions are not invalidated by the one-device rule.
- [x] 5.7 Verify payment status updates are admin-only and active-session protected.
- [x] 5.8 Run the focused test suite and `npm run lint`.

## 6. Replay Hardening Notes

- [x] 6.1 Document in implementation notes that copying only the active session cookie/JWT is blocked by the device secret cookie.
- [x] 6.2 Document in implementation notes that the neutral cookie name is obfuscation only and the random secret/hash validation is the security boundary.
- [x] 6.3 Document that copying all relevant cookies can still replay the same active session unless a stronger device-attestation or risk-control layer is added.
