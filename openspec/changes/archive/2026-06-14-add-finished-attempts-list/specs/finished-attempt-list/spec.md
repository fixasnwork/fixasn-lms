## ADDED Requirements

### Requirement: TryoutAttempt records a finished timestamp
The system SHALL record a `finishedAt` timestamp on `TryoutAttempt` the first time the runner submits its final scores for that attempt.

#### Scenario: First score-writing PUT sets finishedAt
- **WHEN** the runner calls `PUT /api/tryout-attempts/[attemptId]` with `answers` and a new `totalScore`
- **AND** the attempt's `finishedAt` is currently null
- **THEN** the server persists `finishedAt = current timestamp`

#### Scenario: Subsequent PUT does not overwrite finishedAt
- **WHEN** the runner calls `PUT /api/tryout-attempts/[attemptId]` again with new answers
- **AND** the attempt's `finishedAt` is already set
- **THEN** the server preserves the original `finishedAt`

#### Scenario: Flag-only PUT does not touch finishedAt
- **WHEN** the client calls `PUT /api/tryout-attempts/[attemptId]` with only `raguRaguFlags` (no answers, no scores)
- **THEN** `finishedAt` is not modified

#### Scenario: GET returns finishedAt
- **WHEN** the client calls `GET /api/tryout-attempts/[attemptId]`
- **THEN** the response includes `finishedAt: string | null` in the attempt object
- **AND** the value is an ISO timestamp for finished attempts and `null` for in-progress ones

#### Scenario: Attempt list includes finishedAt
- **WHEN** the client calls `GET /api/tryout-attempts?userId=...`
- **THEN** each attempt in the response includes `finishedAt: string | null`

### Requirement: Review mode is gated on finishedAt
The system SHALL show the pembahasan (review) screen for an attempt when and only when the attempt's `finishedAt` is non-null.

#### Scenario: Finished attempt shows review
- **WHEN** user navigates to `/tryout/[attemptId]` for a finished attempt
- **THEN** the page renders `TryoutReviewMode`

#### Scenario: In-progress attempt shows runner
- **WHEN** user navigates to `/tryout/[attemptId]` for an in-progress attempt (`finishedAt === null`)
- **THEN** the page renders the `TryoutEngine` runner

#### Scenario: Zero-score finished attempt shows review
- **WHEN** user navigates to `/tryout/[attemptId]` for a finished attempt with `totalScore === 0`
- **THEN** the page renders `TryoutReviewMode` (not the runner)

### Requirement: User can see a list of finished attempts on the tryout page
The tryout page SHALL render a "Daftar Tryout Selesai" section at the bottom that lists, in reverse chronological order, every finished attempt belonging to a tryout that is in a currently-active package the user has paid for.

#### Scenario: User with finished attempts sees the list
- **WHEN** the user is authenticated
- **AND** has at least one finished attempt in a currently-active, user-owned package
- **THEN** the tryout page renders a "Daftar Tryout Selesai" section at the bottom
- **AND** one card per finished attempt is rendered

#### Scenario: One card per finished attempt
- **WHEN** the list is rendered
- **THEN** each finished attempt produces exactly one card
- **AND** the cards are stacked vertically (one per row)
- **AND** each card spans the full width of the page content container

#### Scenario: Card shows attempt details
- **WHEN** a finished attempt card is rendered
- **THEN** the card displays the tryout name
- **AND** the card displays the parent package name
- **AND** the card displays the finished date (formatted in the user's locale)
- **AND** the card displays the attempt's score (TWK, TIU, TKP, total)

#### Scenario: Newest finished attempts first
- **WHEN** the list is rendered
- **THEN** the cards are ordered by `finishedAt` descending (newest first)

### Requirement: Filter excludes in-progress, unowned, and inactive-package attempts
The list SHALL exclude attempts that do not satisfy all of: (a) finished, (b) parent tryout is in a currently-active package, (c) user has a verified or pending payment for the parent package.

#### Scenario: In-progress attempts are hidden
- **WHEN** the user has an attempt with `finishedAt === null`
- **THEN** that attempt does not appear in the list

#### Scenario: Attempts in inactive packages are hidden
- **WHEN** an attempt's parent package's date window has ended (`isPackageAvailable` returns false)
- **THEN** that attempt does not appear in the list

#### Scenario: Attempts in unowned packages are hidden
- **WHEN** the user has no verified or pending payment for the parent package
- **THEN** the attempt does not appear in the list

#### Scenario: Trial finished attempts are shown
- **WHEN** the user has finished a trial tryout attempt
- **THEN** that attempt appears in the list (trial is always treated as owned)

### Requirement: Card has a "Lihat Pembahasan" trigger
Each finished attempt card SHALL include a single "Lihat Pembahasan" button that navigates the user to the existing review screen for that attempt.

#### Scenario: Click "Lihat Pembahasan" navigates to review
- **WHEN** user clicks the "Lihat Pembahasan" button on a finished attempt card
- **THEN** the user is navigated to `/tryout/[attemptId]`
- **AND** the existing review screen renders for that attempt

#### Scenario: Button is the only action on the card
- **WHEN** a finished attempt card is rendered
- **THEN** the card contains exactly one "Lihat Pembahasan" button
- **AND** no other action buttons (retry, share, delete) are rendered in v1

### Requirement: Empty state when no finished attempts
The section SHALL render a friendly empty state when the user has zero finished attempts that satisfy the filter.

#### Scenario: Empty state for new users
- **WHEN** the user is authenticated
- **AND** has no finished attempts (or none that pass the filter)
- **THEN** the "Daftar Tryout Selesai" section still renders
- **AND** displays an empty-state message explaining the section will populate as the user completes tryouts
