## ADDED Requirements

### Requirement: Package scheduling is date-only

A `Package` row SHALL have two nullable timestamp fields: `startDate` and `endDate`. The `isActive` column SHALL be removed. Package status is derived entirely from dates.

Both fields are nullable. Status derivation:

| `startDate` | `endDate` | Status |
|---|---|---|
| `null` | `null` | **Inactive** — not scheduled, hidden from users |
| set, `> now` | any | **Scheduled** — not yet open, hidden from users |
| set, `≤ now` | `null` | **Active** — open indefinitely, visible to users |
| set, `≤ now` | set, `> now` | **Active** — open within window, visible to users |
| set, `≤ now` | set, `≤ now` | **Expired** — past end, hidden from users |
| `null` | set, `> now` | **Scheduled** — will open when endDate arrives (unusual but valid) |
| `null` | set, `≤ now` | **Expired** — past end, hidden from users |

A package is "available" (visible/purchasable) iff status is **Active**: `startDate` is set and `≤ now`, AND (`endDate` is null OR `endDate > now`).

#### Scenario: Both null = inactive
- **WHEN** a package has `startDate = null` and `endDate = null`
- **THEN** the package is inactive and hidden from user-facing listings

#### Scenario: startDate set in past, endDate null = active (no expiry)
- **WHEN** a package has `startDate` in the past and `endDate = null`
- **THEN** the package is active and visible

#### Scenario: Both set, within window = active
- **WHEN** a package has `startDate` in the past and `endDate` in the future
- **THEN** the package is active and visible

#### Scenario: startDate in future = scheduled
- **WHEN** a package has `startDate` in the future
- **THEN** the package is scheduled (not yet open) and hidden

#### Scenario: endDate in past = expired
- **WHEN** a package has `endDate` in the past
- **THEN** the package is expired and hidden

#### Scenario: null startDate, endDate in future = scheduled
- **WHEN** a package has `startDate = null` and `endDate` in the future
- **THEN** the package is scheduled and hidden (unusual but valid)

#### Scenario: null startDate, endDate in past = expired
- **WHEN** a package has `startDate = null` and `endDate` in the past
- **THEN** the package is expired and hidden

### Requirement: Package API accepts and returns date fields

The `POST /api/packages` and `PUT /api/packages/[id]` endpoints SHALL accept optional `startDate` and `endDate` fields as ISO-8601 strings in the request body, and SHALL return them in the response.

The `GET /api/packages` response SHALL include `startDate` and `endDate` for every package.

Both fields are optional in create/update. If omitted, they default to `null`.

#### Scenario: Create package without dates
- **WHEN** client posts `{ name, price }` to `POST /api/packages`
- **THEN** the response returns the created package with `startDate: null` and `endDate: null` (inactive)

#### Scenario: Create package with dates
- **WHEN** client posts `{ name, price, startDate: "2026-06-01T00:00:00Z", endDate: "2026-06-30T23:59:59Z" }` to `POST /api/packages`
- **THEN** the response returns the created package with dates populated

#### Scenario: Reject startDate >= endDate when both set
- **WHEN** client posts `{ startDate: "2026-06-30T00:00:00Z", endDate: "2026-06-01T00:00:00Z" }`
- **THEN** the API returns 400 with an error indicating the date range is invalid

### Requirement: User-facing listings filter on package availability

The user buy page (`/buy`), dashboard teaser, and other user-facing listings MUST hide packages that are not currently active. A package is "currently active" iff:

- `startDate` is set and `≤ now`, AND
- (`endDate` is null, OR `endDate > now`)

#### Scenario: Active package visible
- **WHEN** a package has `startDate` in the past and `endDate` null
- **THEN** the package appears in listings

#### Scenario: Scheduled package hidden
- **WHEN** a package has `startDate` in the future
- **THEN** the package is hidden

#### Scenario: Expired package hidden
- **WHEN** a package has `endDate` in the past
- **THEN** the package is hidden

### Requirement: Admin sees package status

The admin settings page SHALL display a status indicator for each package: **Active** (green), **Scheduled** (blue), **Expired** (gray), or **Inactive** (red). The status is derived from `startDate`/`endDate` as defined above.

The admin form SHALL provide optional date inputs for `startDate` and `endDate`. Both are optional — leaving both empty creates an inactive package.

### Requirement: Package isActive column removed

The `isActive` column SHALL be removed from the `Package` model in Prisma and the database. All code references to `package.isActive` SHALL be replaced with date-based status derivation. The `isActive` field SHALL be removed from the TypeScript `Package` interface, API responses, hooks, seed data, and admin forms.
