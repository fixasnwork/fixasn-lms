# Per-Tryout Question Fetch

## Requirements

### Requirement: GET endpoint for single tryout questions
The API SHALL expose a GET handler at `/api/tryouts/[tryoutId]/questions` that returns all questions (with options) for the specified tryout.

#### Scenario: Fetch questions for valid tryout
- **WHEN** GET request is made to `/api/tryouts/123/questions`
- **THEN** response contains `{ questions: Question[] }` with all questions for tryout 123, each including nested options ordered by optionIndex

#### Scenario: Tryout not found
- **WHEN** GET request is made to `/api/tryouts/99999/questions` and tryout 99999 does not exist
- **THEN** response returns 404 with `{ error: "Tryout not found" }`

#### Scenario: Invalid tryoutId
- **WHEN** GET request is made to `/api/tryouts/abc/questions`
- **THEN** response returns 400 with `{ error: "Valid tryoutId is required" }`

### Requirement: Per-tryout question fetching hook
The system SHALL provide a `useTryoutQuestions(tryoutId)` React Query hook that fetches questions for a single tryout and caches the result.

#### Scenario: Hook fetches on active tryout
- **WHEN** `useTryoutQuestions(123)` is called with a valid tryoutId
- **THEN** it fetches from `/api/tryouts/123/questions` and returns `{ data: Question[], isFetching, error }`

#### Scenario: Hook skips fetch when no tryout selected
- **WHEN** `useTryoutQuestions(null)` is called
- **THEN** the query is disabled and no API request is made

#### Scenario: Cached data is reused on revisit
- **WHEN** questions for tryout 123 were previously fetched and user navigates back to tryout 123
- **THEN** React Query returns cached data immediately without refetching (within staleTime window)

### Requirement: Admin soal page fetches questions per-tryout
The admin soal page SHALL fetch tryout metadata (without questions) upfront, and fetch questions only for the currently selected tryout.

#### Scenario: Initial page load
- **WHEN** admin soal page loads
- **THEN** it fetches tryout metadata via light query (names, durations, question counts) with a loading spinner, and does NOT fetch any questions

#### Scenario: Selecting a tryout tab
- **WHEN** admin clicks a tryout tab
- **THEN** questions for that tryout are fetched and displayed, while previously-fetched questions remain cached

#### Scenario: Loading spinner during question fetch
- **WHEN** questions are being fetched for a tryout (first load, not cached)
- **THEN** a loading spinner SHALL be displayed in the questions area while data loads

#### Scenario: Switching back to a previously-viewed tryout
- **WHEN** admin switches from tryout A to tryout B, then back to tryout A
- **THEN** tryout A's questions are loaded from cache without an API call

#### Scenario: Adding a question invalidates cache
- **WHEN** admin adds/edits/deletes a question in the current tryout
- **THEN** the per-tryout question query for that tryout is invalidated and refetched, AND the light tryout metadata query is invalidated (to update question counts in tabs)
