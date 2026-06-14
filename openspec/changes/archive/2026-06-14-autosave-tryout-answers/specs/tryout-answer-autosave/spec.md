## ADDED Requirements

### Requirement: Runner autosaves answers every 60 seconds
The system SHALL persist the runner's answer map to the server on a fixed 60-second cadence, using a no-reset rule.

#### Scenario: First answer change schedules a 60s flush
- **WHEN** the user selects an answer
- **AND** no autosave timer is currently running
- **THEN** the runner schedules a PUT to the server containing the current full answer map
- **AND** the flush is scheduled for 60 seconds from the change

#### Scenario: Subsequent change does not reset the running timer
- **WHEN** the user selects another answer
- **AND** an autosave timer is already running
- **THEN** the running timer is NOT reset
- **AND** the existing 60-second flush remains scheduled

#### Scenario: Timer fires once
- **WHEN** the scheduled 60s timer fires
- **THEN** the engine sends exactly one PUT with the current answer map
- **AND** clears the timer ref
- **AND** a subsequent answer change schedules a fresh 60s timer

#### Scenario: No answers means no autosave
- **WHEN** the user has not selected any answers
- **THEN** no autosave is scheduled
- **AND** no PUT is sent

### Requirement: Force-flush on visibility/unload events
The system SHALL force-flush any pending autosave when the user hides the tab, closes the tab, or unmounts the runner.

#### Scenario: Tab hidden triggers immediate flush
- **WHEN** the document visibility changes to hidden
- **THEN** the runner immediately sends a PUT with the current answer map

#### Scenario: Tab close triggers sendBeacon flush
- **WHEN** the page is being unloaded (`pagehide` or `beforeunload`)
- **THEN** the runner sends a `sendBeacon` PUT with the current answer map
- **AND** the beacon is best-effort (fire-and-forget, no awaiting)

#### Scenario: Component unmount triggers immediate flush
- **WHEN** the runner component unmounts (e.g. user navigates away)
- **THEN** the runner immediately sends a PUT with the current answer map

### Requirement: Server is source of truth on rehydration
The runner SHALL reconcile its local answer state from the server on mount and when the tab regains visibility.

#### Scenario: Mount hydrates from server
- **WHEN** the runner mounts for an in-progress attempt
- **THEN** the local answer map is initialized from the server's `answers`
- **AND** any local answer selections made before mount are discarded (server wins)

#### Scenario: Visibility visible triggers server re-fetch
- **WHEN** the document visibility changes from hidden to visible
- **THEN** the runner re-fetches the attempt from the server
- **AND** the local answer map is replaced with the server's `answers`
- **AND** any answers selected while the tab was hidden are discarded (server wins)

#### Scenario: Local state remains authoritative in-session
- **WHEN** the user selects an answer
- **THEN** the local state updates immediately
- **AND** the server is not refetched as a side effect
- **AND** the next autosave flush will persist the new answer

### Requirement: Autosave writes only answer data
The autosave PUT SHALL contain only the `answers` field and SHALL NOT touch the attempt's score or `finishedAt` fields.

#### Scenario: Autosave PUT body shape
- **WHEN** the autosave fires
- **THEN** the PUT body is `{ answers: Record<number, number> }`
- **AND** the body does not contain `twkScore`, `tiuScore`, `tkpScore`, `totalScore`, or `raguRaguFlags`

#### Scenario: Autosave does not change finishedAt
- **WHEN** the autosave fires for an in-progress attempt
- **THEN** the attempt's `finishedAt` remains `null`

### Requirement: Autosave is bounded to the running phase
The system SHALL only autosave while the runner is in the `running` phase.

#### Scenario: No autosave in ready phase
- **WHEN** the runner is in the `ready` phase (pre-start)
- **THEN** no autosave is scheduled

#### Scenario: No autosave in result phase
- **WHEN** the runner is in the `result` phase (post-finish)
- **THEN** no autosave is scheduled
- **AND** any pending autosave timer is cancelled

#### Scenario: No autosave in the final 5 seconds
- **WHEN** the timer has less than 5 seconds remaining
- **THEN** no new autosave is scheduled
- **AND** the finish path will write the final answers via `useUpdateAttempt`

### Requirement: Multi-tab last-write-wins
The system SHALL treat the server as the only source of truth across tabs. Conflicting writes resolve silently with the latest server write winning.

#### Scenario: Two tabs autosave concurrently
- **WHEN** the runner is open in two tabs and both flush within the same window
- **THEN** the server applies both PUTs in order
- **AND** whichever lands second wins per question
- **AND** no user-visible conflict UI is shown

#### Scenario: Tab B sees tab A's writes on refocus
- **WHEN** the user makes changes in tab A
- **AND** the user switches to tab B
- **THEN** tab B re-fetches and replaces its local state with the server's answers
- **AND** no warning or prompt is shown
