## ADDED Requirements

### Requirement: Tryout scheduling is date-only

A `Tryout` row SHALL have two nullable timestamp fields: `startDate` and `endDate`. Tryout status is derived entirely from dates.

Both fields are nullable. Status derivation:

| `startDate` | `endDate` | Status |
|---|---|---|
| `null` | `null` | **Inactive** — not scheduled |
| set, `> now` | any | **Scheduled** — not yet open |
| set, `≤ now` | `null` | **Active** — open indefinitely |
| set, `≤ now` | set, `> now` | **Active** — open within window |
| set, `≤ now` | set, `≤ now` | **Expired** — past end |
| `null` | set, `> now` | **Scheduled** — will open when endDate arrives |
| `null` | set, `≤ now` | **Expired** — past end |

A tryout is "available" iff status is **Active**: `startDate` is set and `≤ now`, AND (`endDate` is null OR `endDate > now`).

The `isTrial` flag is independent of scheduling.

### Requirement: Tryout API accepts and returns date fields

The `POST /api/tryouts` and `PUT /api/tryouts/[id]` endpoints SHALL accept optional `startDate` and `endDate` fields as ISO-8601 strings. Both are optional — omitting them sets them to `null` (inactive).

The `GET /api/tryouts` responses SHALL include `startDate` and `endDate` for every tryout.

#### Scenario: Create tryout without dates
- **WHEN** client posts `{ name }` to `POST /api/tryouts`
- **THEN** the response returns the created tryout with `startDate: null` and `endDate: null` (inactive)

#### Scenario: Reject startDate >= endDate when both set
- **WHEN** client posts `{ startDate: "2026-06-30T00:00:00Z", endDate: "2026-06-01T00:00:00Z" }`
- **THEN** the API returns 400 with an error indicating the date range is invalid

### Requirement: Admin sees tryout status

The admin settings page SHALL display a status indicator for each tryout: **Active** (green), **Scheduled** (blue), **Expired** (gray), or **Inactive** (red). The status is derived from `startDate`/`endDate`.

The admin form SHALL provide optional date inputs for `startDate` and `endDate`. Both are optional.
