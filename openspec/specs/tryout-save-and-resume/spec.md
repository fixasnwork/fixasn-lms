# tryout-save-and-resume Specification

## Purpose
Allow a runner to deliberately save its current state and exit without submitting scores, then resume that attempt from where it stopped with the remaining timer intact.

## Requirements

### Requirement: Runner exposes a "Simpan & Keluar" button on the running phase
The runner SHALL render a "Simpan & Keluar" button while `phase === "running"`. Clicking it SHALL open a confirmation modal listing the answered count and remaining time before persisting and navigating away.

#### Scenario: Button is visible during the running phase
- **WHEN** the runner is in the `running` phase
- **THEN** the header bar shows a "Simpan & Keluar" button next to the timer
- **AND** the button is disabled while a save is in flight

#### Scenario: Button is hidden in the ready and result phases
- **WHEN** the runner is in `phase === "ready"` or `phase === "result"`
- **THEN** no "Simpan & Keluar" button is rendered

#### Scenario: Confirmation modal shows current progress
- **WHEN** the user clicks "Simpan & Keluar"
- **THEN** a confirmation modal opens
- **AND** the modal displays the number of answered questions and the remaining time
- **AND** the modal offers "Batal" and "Simpan & Keluar" actions

#### Scenario: Confirming the modal persists state and exits
- **WHEN** the user confirms "Simpan & Keluar" in the modal
- **THEN** the runner sends a single PUT to `/api/tryout-attempts/{attemptId}` containing the latest `answers`, `raguRaguFlags`, and `timeLeftSeconds`
- **AND** on success, the runner invokes `onExit` which navigates back to `/tryout`
- **AND** the attempt's `finishedAt` remains null

#### Scenario: Cancelling the modal keeps the runner in place
- **WHEN** the user clicks "Batal" or closes the modal
- **THEN** no PUT is sent
- **AND** the runner remains in the `running` phase with no state changes

### Requirement: Server persists `timeLeftSeconds` on the attempt
The server SHALL persist an integer `timeLeftSeconds` on `TryoutAttempt` whenever a PUT body contains it. The column SHALL be nullable; null means "no saved timer, treat as fresh attempt".

#### Scenario: PUT with `timeLeftSeconds` persists the value
- **WHEN** the client calls `PUT /api/tryout-attempts/{attemptId}` with body `{ timeLeftSeconds: 1234 }`
- **THEN** the server writes `attempt.timeLeftSeconds = 1234`
- **AND** the response echoes the persisted value

#### Scenario: PUT without `timeLeftSeconds` leaves the column untouched
- **WHEN** the client calls PUT without `timeLeftSeconds` in the body
- **THEN** the server preserves the existing `timeLeftSeconds` value (no destructive clear)

#### Scenario: Score-writing PUT may zero out `timeLeftSeconds`
- **WHEN** the client calls PUT with score fields
- **AND** the body includes `timeLeftSeconds: 0`
- **THEN** the server writes `attempt.timeLeftSeconds = 0`
- **AND** sets `finishedAt` if not already set

#### Scenario: GET returns `timeLeftSeconds`
- **WHEN** the client calls `GET /api/tryout-attempts/{attemptId}`
- **THEN** the response includes `timeLeftSeconds: number | null` on the attempt object

### Requirement: Resume seeds the timer from the persisted value
The runner SHALL seed `timeLeft` from `initialTimeLeftSeconds` when one is provided AND the attempt is a resume (not a fresh attempt).

#### Scenario: Resume restores the saved timer
- **WHEN** the user re-enters an in-progress attempt via `/tryout/[attemptId]` or the "Lanjutkan" path
- **AND** the server returns `timeLeftSeconds: 1234` (or the page receives it from the resume POST)
- **THEN** the engine initializes `timeLeft = 1234`
- **AND** the countdown resumes from that value

#### Scenario: Fresh attempt uses full duration
- **WHEN** a new attempt is created (`isNew === true`)
- **AND** `timeLeftSeconds` is null on the server
- **THEN** the engine initializes `timeLeft = durationMin * 60`

#### Scenario: Null `timeLeftSeconds` on a stale attempt falls back to full duration
- **WHEN** the attempt has `finishedAt === null` but `timeLeftSeconds === null` (legacy row)
- **THEN** the engine treats it as a fresh attempt and uses `durationMin * 60`

### Requirement: Resume API payload includes the saved timer
The `/api/tryout-attempts/resume` POST response SHALL include `timeLeftSeconds: number | null` on the returned attempt so the page can seed the engine without a follow-up GET.

#### Scenario: Resume response carries the saved timer
- **WHEN** the client calls `POST /api/tryout-attempts/resume` with `{ tryoutId }`
- **AND** an in-progress attempt exists for that user/tryout
- **THEN** the response `{ success, attempt: { id, tryoutId, isNew: false, timeLeftSeconds } }` includes the persisted `timeLeftSeconds`

#### Scenario: New attempt response carries null timer
- **WHEN** the client calls `POST /api/tryout-attempts/resume`
- **AND** a new attempt is created
- **THEN** the response includes `timeLeftSeconds: null`

### Requirement: List page surfaces in-progress attempts
The `/tryout` page SHALL visually mark tryouts that have an in-progress attempt for the current user so they can resume from the list instead of starting over.

#### Scenario: In-progress badge on the affected tryout row
- **WHEN** the user has an in-progress attempt for a tryout in an owned package
- **THEN** the corresponding tryout button in the package card shows a "Lanjutkan" label and a small answered-count hint
- **AND** clicking it routes through the existing resume flow, landing in the running engine with the saved timer

#### Scenario: No banner or badge when nothing is in progress
- **WHEN** the user has no in-progress attempts
- **THEN** the list page renders as today (no extra banner)
