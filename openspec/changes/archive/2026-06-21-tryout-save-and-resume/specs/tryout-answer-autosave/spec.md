## ADDED Requirements

### Requirement: Autosave carries the current timer
The autosave hook SHALL include `timeLeftSeconds` in every PUT body it sends, reflecting the live `timeLeft` at the moment of the flush.

#### Scenario: 60s cadence flush carries the timer
- **WHEN** the 60-second autosave timer fires
- **THEN** the PUT body contains `timeLeftSeconds` equal to the engine's `timeLeft` at flush time

#### Scenario: Visibility-hidden flush carries the timer
- **WHEN** `document.visibilityState` changes to `hidden`
- **THEN** the immediate flush PUT body contains `timeLeftSeconds`

#### Scenario: Unmount flush carries the timer
- **WHEN** the runner component unmounts
- **THEN** the immediate flush PUT body contains `timeLeftSeconds`

#### Scenario: sendBeacon flush carries the timer
- **WHEN** the pagehide or beforeunload handler fires a sendBeacon flush
- **THEN** the beacon payload contains `timeLeftSeconds` alongside `answers`
