## ADDED Requirements

### Requirement: Latest Non-Admin Login Becomes Active Session
The system SHALL allow a non-admin user to sign in on a new device or browser even when the same account already has another active session, and the newest successful login MUST become the only active session for that non-admin account.

#### Scenario: New login replaces existing active session
- **WHEN** a non-admin user successfully signs in on a second device with an account that is already signed in elsewhere
- **THEN** the second device becomes the active session for that account
- **AND** the previous session for that account is no longer valid
- **AND** the second device receives a new active device secret cookie

#### Scenario: New login is not blocked by existing session
- **WHEN** a non-admin user attempts to sign in with valid credentials while another session for the same account exists
- **THEN** the sign-in succeeds according to the existing authentication provider rules
- **AND** the system replaces the active session with the new login

### Requirement: Active Device Secret Is Required
The system MUST issue a high-entropy random HttpOnly device secret cookie for each fresh non-admin login and MUST validate that cookie against the server-stored active device secret hash before accepting the session.

#### Scenario: Active session includes matching device secret
- **WHEN** a non-admin request includes the current session marker and a matching active device secret cookie
- **THEN** the system accepts the session as current

#### Scenario: Session cookie is copied without device secret
- **WHEN** a non-admin request includes a copied active session cookie or JWT but does not include the matching active device secret cookie
- **THEN** the system rejects the request as unauthenticated
- **AND** protected account, payment, profile, upload, or tryout data is not returned

#### Scenario: Device secret hash is stored server-side
- **WHEN** the system creates an active device secret for a non-admin login
- **THEN** the raw device secret is set only in a secure HttpOnly cookie with a neutral name that does not advertise authentication or authorization purpose
- **AND** only a hash of the device secret is stored in the database

#### Scenario: Fresh login bootstraps device secret
- **WHEN** a non-admin session has the current active session marker and the account has no active device secret hash yet
- **THEN** the system allows the initial page navigation needed to call the device-secret sync endpoint
- **AND** the sync endpoint issues the neutral HttpOnly cookie and stores its hash before subsequent protected API access is accepted

#### Scenario: Cookie name is not security boundary
- **WHEN** the system names the device secret cookie
- **THEN** the cookie name does not include obvious authentication words such as auth, session, token, or device
- **AND** the system still treats the random secret value and server-side hash validation as the security boundary

### Requirement: Older Non-Admin Sessions Are Rejected
The system MUST reject any authenticated non-admin request whose session is older than the account's current active session marker or whose active device secret cookie is missing or mismatched.

#### Scenario: Stale session opens protected page
- **WHEN** an older non-admin session requests a protected dashboard page after a newer login has replaced it
- **THEN** the system treats the older session as unauthenticated
- **AND** the user is redirected to the login flow
- **AND** the user can see the message "Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan."

#### Scenario: Stale session calls protected API
- **WHEN** an older non-admin session calls an authenticated API route after a newer login has replaced it
- **THEN** the API request is rejected as unauthenticated
- **AND** protected account, payment, profile, upload, or tryout data is not returned

### Requirement: Client State Reflects Session Freshness
The client application MUST clear local authenticated state when the current NextAuth session is missing, stale, or invalid.

#### Scenario: Browser detects stale session
- **WHEN** a browser session is determined to be stale because the account signed in elsewhere
- **THEN** the client clears the local auth store
- **AND** the user is no longer shown authenticated-only navigation or dashboard state
- **AND** the user can see the message "Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan."

#### Scenario: Active session remains hydrated
- **WHEN** the current browser holds the latest active session for the account
- **THEN** the client hydrates the local auth store from the session as it does today
- **AND** existing role-based navigation behavior remains available

### Requirement: Admin Sessions Are Excluded
The system MUST NOT apply the one-active-device replacement rule to administrator accounts in the initial release.

#### Scenario: Admin signs in on multiple devices
- **WHEN** an admin user signs in on another device
- **THEN** the system preserves the existing admin authentication behavior
- **AND** the previous admin session is not invalidated by the one-active-device rule

### Requirement: Role Authorization Remains Enforced
The system MUST preserve existing role-based authorization after validating that a non-admin session is the active session for the account.

#### Scenario: Active non-admin session accesses admin area
- **WHEN** a non-admin user has the current active session for the account and requests an admin page
- **THEN** the system denies access using the existing role authorization behavior

#### Scenario: Payment status update requires admin
- **WHEN** a request updates payment verification status, proof URL, or block reason
- **THEN** the system requires an active authenticated session
- **AND** the session role must be admin
- **AND** non-admin or unauthenticated requests are rejected

### Requirement: Session Replacement Is Account Scoped
The system MUST invalidate only older non-admin sessions for the same user account and MUST NOT invalidate sessions belonging to other accounts.

#### Scenario: One account logs in on another device
- **WHEN** non-admin user A signs in on a new device
- **THEN** older sessions for user A are invalidated
- **AND** active sessions for user B remain valid

### Requirement: Full Cookie Replay Limitation Is Explicit
The system MUST document that manually copying all relevant cookies, including both the active session cookie/JWT and the neutral-named device secret cookie, is not prevented by active-session marker and device-secret comparison alone.

#### Scenario: Active cookies are copied to another browser
- **WHEN** someone manually copies both the currently active session cookie or JWT and the matching device secret cookie to another browser
- **THEN** both browsers can present the same active credential set unless an additional device-attestation or risk-control layer is implemented
