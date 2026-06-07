## ADDED Requirements

### Requirement: Tryout attempts require available tryout and parent package windows

The endpoint `POST /api/tryout-attempts` MUST reject a new attempt with HTTP 403 if the tryout or any parent package is not currently **Active** (as defined by date-only status derivation).

A tryout or package is **Active** iff: `startDate` is set and `≤ now`, AND (`endDate` is null OR `endDate > now`).

Specific rejection conditions:
- The tryout has `startDate = null` (inactive), OR
- The tryout has `startDate > now` (scheduled), OR
- The tryout has `endDate` set and `≤ now` (expired), OR
- The tryout is a member of at least one `PackageTryout` whose parent `Package` is not Active.

In-progress attempts are NOT voided when the window closes. The gate applies only at attempt creation.

#### Scenario: Tryout with all prerequisites active
- **WHEN** a tryout is Active and every parent package is Active
- **THEN** `POST /api/tryout-attempts` succeeds

#### Scenario: Tryout inactive (both dates null)
- **WHEN** a tryout has `startDate = null` and `endDate = null`
- **THEN** returns 403 with `error: "tryout_unavailable"`, `reason: "out_of_window"`

#### Scenario: Tryout scheduled (startDate in future)
- **WHEN** a tryout has `startDate` after the current time
- **THEN** returns 403 with `reason: "out_of_window"`

#### Scenario: Tryout expired (endDate in past)
- **WHEN** a tryout has `endDate` before the current time
- **THEN** returns 403 with `reason: "out_of_window"`

#### Scenario: Parent package not active
- **WHEN** a tryout belongs to a package that is not Active (inactive, scheduled, or expired)
- **THEN** returns 403 with `reason: "package_closed"`

#### Scenario: Tryout in no package
- **WHEN** a tryout has no `PackageTryout` rows
- **THEN** only the tryout's own status is validated

### Requirement: Availability gate can be disabled via feature flag

The availability gate on `POST /api/tryout-attempts` MUST be bypassed when the environment variable `TRYOUT_DATE_PERIOD_ENABLED` is set to a falsy string (`"false"`, `"0"`, empty). Default (unset) = `true` (gate enabled).

### Requirement: Availability check is centralized

A shared helper `isAvailable(entity, now?)` in `lib/availability.ts` MUST return `true` iff the entity is Active:

- `startDate` is set and `≤ now`
- `endDate` is null OR `endDate > now`

`isActive` is NOT a parameter — the function is purely date-driven. Used by:
- User buy page filter
- Dashboard teaser filter
- Attempt gate
- Admin status indicator derivation
