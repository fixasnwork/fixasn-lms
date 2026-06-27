## ADDED Requirements

### Requirement: Profile page shows active tryout packages
The profile page (`/profile`) SHALL render a "Paket Aktif" section below the profile card and above the logout button. The section SHALL list every package that the user currently owns (payment status `pending` or `verified`) AND that is date-available per `isPackageAvailable`.

#### Scenario: User with two active packages
- **WHEN** the user has one `verified` paid package and one `pending` trial package, both within their date window
- **THEN** the section renders two cards in the order they appear in the packages list, each with name, description, tryout count, progress, average best score, remaining days, validity window, and a primary CTA

#### Scenario: User with no active packages
- **WHEN** the user has no payments with status `pending` or `verified` for any date-available package
- **THEN** the section renders an empty state with a 📦 icon, a short explanation, and a primary CTA linking to `/buy`

#### Scenario: Loading state
- **WHEN** the packages or payments query is still fetching on first render
- **THEN** the section renders a single placeholder card with the text "Memuat paket..."

### Requirement: Active package card displays progress and score statistics
Each active package card SHALL display three labeled statistics: total sessions (from `package.tryoutCount`, falling back to the count of tryouts in the package), average best score (arithmetic mean of the user's best `totalScore` per tryout in this package, rounded to the nearest integer, rendered as `—` when no finished attempt exists), and remaining days (`Math.ceil((endDate - now) / 86_400_000)` clamped to `≥ 0`, rendered as `∞` when `endDate` is null).

#### Scenario: Package with some finished attempts
- **WHEN** the user has finished attempts for 3 of 5 tryouts in the package, with best scores 410, 420, 405
- **THEN** the card shows "Sesi: 5", "Skor Avg: 412", "Sisa Hari: <computed>", progress bar at 60%, and "3 / 5 selesai"

#### Scenario: Package with no finished attempts
- **WHEN** the user owns a trial package and has not started any of its tryouts
- **THEN** the card shows "Sesi: 1", "Skor Avg: —", "Sisa Hari: <computed>", progress bar at 0%, and "0 / 1 selesai"

### Requirement: Active package card uses brand-aligned visual design
Each active package card SHALL use the project's existing card visual language: white background, `rounded-2xl` corners, `shadow-md`, `border border-gray-100`, Montserrat typeface, and a 3px brand-gradient strip across the top (navy→blue for paid packages, amber→orange for `isTrial` packages). A status pill ("Aktif" on green for paid, "Trial" on amber for trial) SHALL be rendered in the card header with a small pulsing dot.

#### Scenario: Paid package card
- **WHEN** the package has `isTrial === false`
- **THEN** the top strip is `linear-gradient(90deg, #1B3A6B, #2563EB)`, the icon background uses the same gradient, the status pill is `bg-green-500` with text "Aktif", and the primary CTA uses the `primary` button variant

#### Scenario: Trial package card
- **WHEN** the package has `isTrial === true`
- **THEN** the top strip is `linear-gradient(90deg, #F59E0B, #FB923C)`, the icon background uses the same gradient, the status pill is `bg-amber-500` with text "Trial", and the primary CTA uses the `gold` button variant

### Requirement: Active package card honors reduced-motion preference
All motion introduced by this section (card entrance, progress bar fill, status-dot pulse) SHALL be suppressed when the user has `prefers-reduced-motion: reduce` set.

#### Scenario: User with reduced-motion enabled
- **WHEN** the OS-level reduced-motion setting is enabled
- **THEN** cards appear in their final state without entrance animation, the progress bar renders at its final width immediately, and the status dot does not pulse
