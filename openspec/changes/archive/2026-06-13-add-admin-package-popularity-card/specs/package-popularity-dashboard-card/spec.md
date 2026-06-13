## ADDED Requirements

### Requirement: Admin dashboard shows package popularity
The system SHALL display a "Popularitas Paket" analytics card on `/admin/dashboard` that lists every non-deleted package with its purchase share percentage.

#### Scenario: Packages have purchase activity
- **WHEN** an admin opens `/admin/dashboard` and non-deleted payment records exist for non-deleted packages
- **THEN** the system displays the "Popularitas Paket" card
- **AND** each non-deleted package is listed with its package name and percentage share of total counted purchases
- **AND** packages are ordered from highest purchase count to lowest purchase count
- **AND** no raw purchase counts are displayed
- **AND** the header uses 📦 emoji and the progress bar uses the primary blue color

#### Scenario: Packages have no purchase activity
- **WHEN** an admin opens `/admin/dashboard` and no counted payment records exist
- **THEN** the system displays the "Popularitas Paket" card
- **AND** the card does not show `NaN`, `Infinity`, or misleading percentages
- **AND** the card shows a clear empty or zero-state message

### Requirement: Package popularity uses current purchase source
The system SHALL calculate package popularity from non-deleted payment records grouped by package, because current payment flow writes `payments` and does not populate `userPurchases`.

#### Scenario: Payment rows are counted
- **WHEN** the dashboard calculates package popularity
- **THEN** each non-deleted payment associated with a non-deleted package counts toward that package's purchase count
- **AND** each package percentage equals that package's counted payments divided by total counted payments across non-deleted packages, rounded for display

#### Scenario: Deleted or unavailable source rows are ignored
- **WHEN** payment records are soft-deleted or reference deleted packages
- **THEN** those records are excluded from the package popularity counts and percentages
