# tryout-ragu-ragu-flag Specification

## Purpose
TBD - created by archiving change add-ragu-ragu-flag. Update Purpose after archive.
## Requirements
### Requirement: User can flag a question as Ragu-ragu
The system SHALL allow a user, while a tryout attempt is in progress, to flag the currently displayed question as "Ragu-ragu" (unsure).

#### Scenario: Flag an unanswered question
- **WHEN** user clicks the "Tandai Ragu-ragu" button on a question
- **THEN** the question is marked as Ragu-ragu for that attempt
- **AND** the change is persisted to the server

#### Scenario: Flag persists across reload
- **WHEN** user flags a question and reloads the attempt page
- **THEN** the same question is shown as Ragu-ragu

#### Scenario: Unflag a flagged question
- **WHEN** user clicks "Batalkan Ragu-ragu" on a previously flagged question
- **THEN** the Ragu-ragu mark is removed
- **AND** the change is persisted to the server

#### Scenario: Flag survives answer change
- **WHEN** user changes their selected answer on a flagged question
- **THEN** the Ragu-ragu flag remains set
- **AND** the answer change is persisted independently

### Requirement: Visual mark on flagged question card
The system SHALL visually distinguish a flagged question on the attempt runner.

#### Scenario: Flagged question card styling
- **WHEN** a question is flagged as Ragu-ragu
- **THEN** the question card displays a yellow border
- **AND** displays a flag icon
- **AND** shows a "Ragu-ragu" label

#### Scenario: Unflagged question card styling
- **WHEN** a question is not flagged
- **THEN** the question card shows no yellow border or flag indicator

### Requirement: Visual mark on navigation palette
The system SHALL mark flagged questions in the question navigation palette (number grid).

#### Scenario: Flagged question in palette
- **WHEN** a question is flagged as Ragu-ragu
- **THEN** its tile in the navigation palette displays a yellow dot indicator

#### Scenario: Unflagged question in palette
- **WHEN** a question is not flagged
- **THEN** its tile in the navigation palette shows no yellow dot

### Requirement: Flag state is per-attempt
The Ragu-ragu flag SHALL be scoped to a single attempt and SHALL NOT carry over to a new attempt for the same tryout.

#### Scenario: New attempt starts unflagged
- **WHEN** user starts a new attempt for the same tryout
- **THEN** no questions in the new attempt are flagged by default

#### Scenario: Old attempt flags are not visible on new attempt
- **WHEN** user opens a new attempt
- **THEN** only flags belonging to that new attempt are shown

### Requirement: Flag state is persisted to the database
The system SHALL persist the Ragu-ragu flag on the corresponding `AttemptAnswer` row in the database.

#### Scenario: Server accepts flag write
- **WHEN** client sends a flag write for a question in the attempt
- **THEN** the server creates or updates the `AttemptAnswer` row with `raguRagu = true`

#### Scenario: Server returns flag on read
- **WHEN** client fetches the attempt
- **THEN** the response includes the flag state for each question

### Requirement: Flag indicator in result review
The system SHALL display a Ragu-ragu indicator on each question that was flagged in the post-submit result review.

#### Scenario: Flagged question in review
- **WHEN** a question was flagged as Ragu-ragu during the attempt
- **THEN** the result review shows a "Ragu-ragu" pill next to the question number

#### Scenario: Unflagged question in review
- **WHEN** a question was not flagged
- **THEN** the result review shows no Ragu-ragu pill for that question

### Requirement: Flag count in result summary
The system SHALL display the count of flagged questions in the result summary.

#### Scenario: Summary shows flagged count
- **WHEN** an attempt is completed and the result page is shown
- **THEN** the summary displays "X dari Y soal ditandai Ragu-ragu"
- **AND** X equals the number of questions flagged
- **AND** Y equals the total number of questions in the tryout

#### Scenario: Zero flagged
- **WHEN** no questions were flagged in the attempt
- **THEN** the summary displays "0 dari Y soal ditandai Ragu-ragu"

### Requirement: Flag is read-only after submission
The system SHALL NOT allow toggling the Ragu-ragu flag from the post-submit result review page.

#### Scenario: No toggle in review
- **WHEN** user views the result review
- **THEN** no flag toggle button is rendered
- **AND** the displayed flag state matches the persisted value at submission time

