## ADDED Requirements

### Requirement: Browser-close guard on in-progress tryout
While a tryout attempt is in the `running` phase (timer ticking, answers dirty) at `/tryout/[attemptId]`, the page SHALL register a `beforeunload` listener that calls `event.preventDefault()` and sets `event.returnValue` to a non-empty value. The listener SHALL be removed on attempt completion, page unmount, or when the phase changes away from `running`.

#### Scenario: User attempts to close the tab
- **WHEN** the tryout is in the `running` phase and the user clicks the browser's tab-close button
- **THEN** the browser shows its native "Changes you made may not be saved" confirmation prompt

#### Scenario: Guard is removed after submission
- **WHEN** the tryout transitions from `running` to `result` (timer expires or user clicks "Selesai")
- **THEN** the `beforeunload` listener is removed and subsequent close attempts are not interrupted

#### Scenario: Guard is removed on page navigation
- **WHEN** the user navigates away from `/tryout/[attemptId]` after a successful save
- **THEN** the listener cleanup runs and the store guard is reset

### Requirement: Sidebar nav-guard modal intercepts in-app navigation
While a tryout attempt is in the `running` phase, the `UserSidebar` SHALL intercept clicks on the primary navigation items (Dashboard, Tryout SKD, Beli Paket, Video Belajar, Ranking, Profil) and open a confirmation modal instead of routing. The modal SHALL display a warning that unsaved progress may be lost, an optional progress summary (answered count, total questions, formatted remaining time) sourced from the nav-guard store, and exactly two action buttons.

#### Scenario: User clicks a sidebar item during running tryout
- **WHEN** the user clicks "Dashboard" in the sidebar while a tryout is running
- **THEN** the click does not navigate; a modal titled "Keluar dari Tryout?" appears with "Batal" and "Simpan & Keluar" buttons

#### Scenario: User clicks the active item
- **WHEN** the user clicks a sidebar item whose target path matches the current pathname
- **THEN** no modal appears and no navigation occurs (no-op)

#### Scenario: User clicks Logout
- **WHEN** the user clicks the Logout button in the sidebar while a tryout is running
- **THEN** the Logout action proceeds immediately without showing the modal

### Requirement: Save-and-leave flushes the same payload as the in-engine button
The "Simpan & Keluar" button in the sidebar nav-guard modal SHALL call the same `useUpdateAttemptAnswers` mutation (with the current `answers` and `timeLeftSeconds`) and the same `useUpdateAttemptFlags` mutation (when `raguRagu` is non-empty) that the in-engine "Simpan & Keluar" button uses. On success, the modal SHALL close and the router SHALL navigate to the requested path. On failure, the modal SHALL stay open and the error message SHALL be displayed inline.

#### Scenario: Save succeeds and navigation happens
- **WHEN** the user confirms "Simpan & Keluar" and the PUT resolves successfully
- **THEN** the modal closes, the route changes to the requested destination, and the tryout engine's timer interval is cleared

#### Scenario: Save fails
- **WHEN** the user confirms "Simpan & Keluar" and the PUT rejects (e.g., network error)
- **THEN** the modal remains open, an error message in red is shown, both buttons are re-enabled, and no navigation occurs

### Requirement: Guard is inactive outside the running phase
The nav guard SHALL be inactive when the tryout engine is in the `ready` phase (start screen) or `result` phase (review screen), and when no attempt is loaded. The store `isActive` flag SHALL be `false` in all of these cases.

#### Scenario: User on ready screen
- **WHEN** the tryout is showing the start screen and the user clicks a sidebar item
- **THEN** navigation proceeds immediately without showing a modal

#### Scenario: User on result screen
- **WHEN** the tryout is showing the review screen and the user clicks a sidebar item
- **THEN** navigation proceeds immediately without showing a modal
