## MODIFIED Requirements

### Requirement: User access derives from non-rejected purchase
The system SHALL grant video access to a user when (a) their role is `admin`, OR (b) they have a `UserPurchase` row whose `status` is not in `{rejected, expired}` AND whose `package.includesVideoPembelajaran === true`. The `UserPurchase` row MUST be created as a side effect of the payment lifecycle: `POST /api/payments` MUST upsert a `UserPurchase` for the same `(userId, packageId)` immediately after the `Payment` is created (pending payments grant access), `PUT /api/payments` MUST upsert the `UserPurchase` when the admin transitions a payment to `verified` (idempotent — handles payments that pre-date this fix), and `PUT /api/payments` MUST soft-delete the linked `UserPurchase` when the admin transitions a payment to `rejected` / `expired` / `blocked`. The upsert key SHALL be the `@@unique([userId, packageId])` constraint so re-submits, retries, and status flip-flops collapse to a single active grant per user per package.

#### Scenario: Pending purchase grants access
- **WHEN** a user has a `UserPurchase` with `status: "pending"` for a video-enabled package
- **THEN** `GET /api/videos` returns `hasAccess: true` and the published video list.

#### Scenario: Verified purchase grants access
- **WHEN** a user has a `UserPurchase` with `status: "verified"` for a video-enabled package
- **THEN** `GET /api/videos` returns `hasAccess: true` and the published video list.

#### Scenario: Rejected purchase denies access
- **WHEN** the only qualifying `UserPurchase` is `status: "rejected"`
- **THEN** `GET /api/videos` returns `hasAccess: false`, `videos: []`, and `accessReason: "no_video_package"`.

#### Scenario: Expired purchase denies access
- **WHEN** the only qualifying `UserPurchase` is `status: "expired"`
- **THEN** `GET /api/videos` returns `hasAccess: false`, `videos: []`, and `accessReason: "no_video_package"`.

#### Scenario: No purchase at all denies access
- **WHEN** a user has no `UserPurchase` rows
- **THEN** `GET /api/videos` returns `hasAccess: false`, `videos: []`, and `accessReason: "no_video_package"`.

#### Scenario: Admin role short-circuits
- **WHEN** the caller has role `admin`
- **THEN** `GET /api/videos` returns `hasAccess: true` and all published videos, regardless of purchases.

#### Scenario: Trial flag is irrelevant
- **WHEN** a user has a `UserPurchase` for a package where `isTrial: true` but `includesVideoPembelajaran: false`
- **THEN** `GET /api/videos` returns `hasAccess: false`.

#### Scenario: Payment creation grants access immediately
- **WHEN** a user successfully POSTs to `/api/payments` (with valid `packageId` and either an existing or new payment intent)
- **THEN** the server creates a `Payment` row AND upserts a `UserPurchase` row for the same `(userId, packageId)` with `paymentId` pointing at the new payment
- **AND** a subsequent `GET /api/videos` returns `hasAccess: true` for the buyer if the linked package has `includesVideoPembelajaran: true`.

#### Scenario: Admin verification is idempotent
- **WHEN** an admin PUTs a payment's `status` to `verified`
- **THEN** the server upserts a `UserPurchase` row for the payment's `(userId, packageId)` if one does not already exist
- **AND** if a soft-deleted `UserPurchase` already exists for that pair (e.g., a previously-rejected payment), the upsert MUST set `deletedAt: null` and re-activate the grant
- **AND** if an active `UserPurchase` already exists, the upsert MUST update `paymentId` to the verified payment and leave `deletedAt: null`.

#### Scenario: Admin deny revokes the access grant
- **WHEN** an admin PUTs a payment's `status` to `rejected`, `expired`, or `blocked`
- **THEN** the server soft-deletes the linked `UserPurchase` row by setting `deletedAt: now()`
- **AND** a subsequent `GET /api/videos` returns `hasAccess: false` for the buyer if the soft-deleted row was the only grant for a video-enabled package.
