## ADDED Requirements

### Requirement: TWK and TIU award 1 point per correct answer

The system SHALL award 1 point for each correctly answered TWK or TIU question and 0 points for each incorrect or unanswered TWK or TIU question. This rule applies globally to every tryout and is not configurable per tryout, per category, or per question. The system SHALL NOT apply negative scoring for incorrect answers.

#### Scenario: Correct TWK answer scores 1 point

- **WHEN** a user submits a correct answer to a TWK question
- **THEN** the system adds 1 point to the user's TWK score

#### Scenario: Correct TIU answer scores 1 point

- **WHEN** a user submits a correct answer to a TIU question
- **THEN** the system adds 1 point to the user's TIU score

#### Scenario: Incorrect or missing TWK or TIU answer scores 0

- **WHEN** a user submits an incorrect answer or no answer to a TWK or TIU question
- **THEN** the system adds 0 points for that question

#### Scenario: Rule applies to every tryout

- **WHEN** any tryout (paid package, trial, or custom) is finished
- **THEN** every correct TWK or TIU answer contributes exactly 1 point regardless of tryout identity

### Requirement: TWK passing threshold is 13 correct answers

A TWK section is considered passed when the user has at least 13 correct answers. The system SHALL display this threshold to the user as 13 and SHALL use it as the pass/fail boundary for the TWK result card.

#### Scenario: TWK passes at 13 correct

- **WHEN** a user finishes a tryout with 13 or more correct TWK answers
- **THEN** the result card shows the TWK section as passing

#### Scenario: TWK fails below 13 correct

- **WHEN** a user finishes a tryout with fewer than 13 correct TWK answers
- **THEN** the result card shows the TWK section as failing

### Requirement: TIU passing threshold is 16 correct answers

A TIU section is considered passed when the user has at least 16 correct answers. The system SHALL display this threshold to the user as 16 and SHALL use it as the pass/fail boundary for the TIU result card.

#### Scenario: TIU passes at 16 correct

- **WHEN** a user finishes a tryout with 16 or more correct TIU answers
- **THEN** the result card shows the TIU section as passing

#### Scenario: TIU fails below 16 correct

- **WHEN** a user finishes a tryout with fewer than 16 correct TIU answers
- **THEN** the result card shows the TIU section as failing

### Requirement: Result card label uses "Ambang: N soal" format

The per-category result card SHALL render the threshold for each category as `Ambang: {N} soal` where `{N}` is the integer threshold. The system SHALL include the `soal` unit suffix so the small number is unambiguous to the user.

#### Scenario: TWK card label

- **WHEN** the result card is rendered for a finished attempt
- **THEN** the TWK card shows `Ambang: 13 soal`

#### Scenario: TIU card label

- **WHEN** the result card is rendered for a finished attempt
- **THEN** the TIU card shows `Ambang: 16 soal`

### Requirement: Result card header reports total passing threshold 195

The result-phase header SHALL display the SKD total passing threshold as `Nilai Ambang Batas SKD: 195 (TWK≥13, TIU≥16, TKP≥166)`. The system SHALL keep this header in sync with the per-category labels.

#### Scenario: Header copy on result card

- **WHEN** the result-phase card is rendered for any finished attempt
- **THEN** the header reads `Nilai Ambang Batas SKD: 195 (TWK≥13, TIU≥16, TKP≥166)`
