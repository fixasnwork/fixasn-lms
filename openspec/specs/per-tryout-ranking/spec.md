# per-tryout-ranking Specification

## Purpose

TBD - created by archiving change add-per-tryout-ranking. Update Purpose after archive.

## Requirements

### Requirement: Per-tryout ranking endpoint

The system SHALL expose `GET /api/tryouts/[tryoutId]/ranking` that returns a per-tryout leaderboard.

#### Scenario: Valid request returns entries + viewer + participant count

- **WHEN** an authenticated user calls `GET /api/tryouts/42/ranking`
- **THEN** the response is HTTP 200 with JSON `{ entries: RankingEntry[], viewer: { rank, score } | null, participantCount: number, period: 'all' }`
- **AND** `entries` is ordered by score descending (tie-broken by earliest finishedAt ascending)
- **AND** each `RankingEntry` includes `userId`, `name`, `avatar`, `initials`, `totalScore` (the user's best score on this tryout)
- **AND** `viewer.rank` is the current user's 1-based rank if they have a finished attempt for the tryout, else `null`
- **AND** `viewer.score` matches the current user's best score for the tryout

#### Scenario: Period filter applies a time window

- **WHEN** the request includes `?period=weekly`
- **THEN** only attempts with `finishedAt >= now - 7 days` are included
- **AND** `period` in the response echoes back as `'weekly'`

#### Scenario: Monthly period

- **WHEN** the request includes `?period=monthly`
- **THEN** only attempts with `finishedAt >= now - 30 days` are included
- **AND** `period` in the response echoes back as `'monthly'`

#### Scenario: Invalid period falls back to all

- **WHEN** the request includes `?period=invalid`
- **THEN** the response uses `period: 'all'`

### Requirement: Endpoint authentication and authorization

The endpoint SHALL require an active session and SHALL only return data to users who have a finished attempt for the requested tryout.

#### Scenario: Unauthenticated request is rejected

- **WHEN** the request has no valid session
- **THEN** the response is HTTP 401

#### Scenario: User with no finished attempt for the tryout is rejected

- **WHEN** the authenticated user has zero `TryoutAttempt` records with `tryoutId = X` and `finishedAt != null`
- **THEN** the response is HTTP 403

#### Scenario: User with at least one finished attempt is allowed

- **WHEN** the authenticated user has ≥ 1 `TryoutAttempt` with `tryoutId = X` and `finishedAt != null`
- **THEN** the response is HTTP 200

### Requirement: Lazy compute with in-memory TTL cache

The endpoint SHALL cache each `(tryoutId, period)` result in process memory for 5 minutes and SHALL recompute on miss.

#### Scenario: First request for a (tryoutId, period) computes

- **WHEN** no cache entry exists for the tuple
- **THEN** the server runs the Prisma aggregation and stores the result with a timestamp

#### Scenario: Second request within TTL reuses cache

- **WHEN** a cache entry exists and is < 300s old
- **THEN** the server returns the cached result without querying Prisma

#### Scenario: Request after TTL expiry recomputes

- **WHEN** a cache entry exists but is ≥ 300s old
- **THEN** the server discards it and recomputes

#### Scenario: Concurrent misses for the same key share a single compute

- **WHEN** N requests arrive within the same event loop tick for the same `(tryoutId, period)` and no cache entry exists
- **THEN** exactly one Prisma aggregation runs and all N responses return the same result

### Requirement: Aggregation takes each user's best attempt for the tryout

The ranking computation SHALL group finished attempts by `userId`, keep the maximum `totalScore` per user, and tie-break by earliest `finishedAt`.

#### Scenario: User with multiple attempts appears once

- **WHEN** a user has 3 finished attempts for tryout X with scores 200, 250, 220
- **THEN** the user appears exactly once in `entries` with `totalScore = 250`

#### Scenario: Tied scores break by earliest finishedAt

- **WHEN** two users have the same `totalScore`
- **THEN** the user with the earlier `finishedAt` is ranked higher

#### Scenario: Deleted attempts are excluded

- **WHEN** an attempt has `deletedAt != null`
- **THEN** it is excluded from the aggregation

#### Scenario: In-progress attempts are excluded

- **WHEN** an attempt has `finishedAt === null`
- **THEN** it is excluded from the aggregation

### Requirement: Pembahasan page renders an outer Pembahasan/Ranking tab nav

`TryoutReviewMode` SHALL render a two-tab control at the top of the page, with "Pembahasan" as the default active tab.

#### Scenario: Default tab is Pembahasan

- **WHEN** a user lands on `/tryout/[attemptId]` for a finished attempt
- **THEN** the pembahasan question card is visible
- **AND** the Ranking tab body is not in the DOM (lazy mount)

#### Scenario: Switching to Ranking tab mounts the panel

- **WHEN** the user clicks the "Ranking" tab
- **THEN** the Ranking panel mounts and the pembahasan question card unmounts
- **AND** the Ranking panel triggers a fetch for the default `period=all`

#### Scenario: Switching back to Pembahasan unmounts the panel

- **WHEN** the user clicks the "Pembahasan" tab
- **THEN** the Ranking panel unmounts
- **AND** the previously-selected question index is preserved

#### Scenario: Tab badge shows current rank and participant count

- **WHEN** the user has a finished attempt and ranking data is available
- **THEN** the Ranking tab label reads `Ranking · #<rank>/<participantCount>`
- **AND** the `#<rank>/<participantCount>` is replaced with a loading dot while the fetch is in flight

### Requirement: Ranking panel renders a sub-tab nav for the time period

`TryoutRankingPanel` SHALL render an All-time / Mingguan / Bulanan sub-tab nav, defaulting to "all", that triggers a re-fetch on change.

#### Scenario: Sub-tab default is All-time

- **WHEN** the Ranking tab is first opened
- **THEN** the All-time sub-tab is active
- **AND** the request uses `period=all`

#### Scenario: Switching sub-tab re-fetches

- **WHEN** the user clicks "Mingguan"
- **THEN** the request uses `period=weekly`
- **AND** the entries, podium, your-row, and participant count update to reflect the new window

#### Scenario: Sub-tab resets on remount

- **WHEN** the user navigates away from the Ranking tab and back
- **THEN** the sub-tab is reset to "all"

### Requirement: Podium shows the top 3 finishers

The Ranking panel SHALL render a top-3 podium using the same visual style as the global ranking page.

#### Scenario: Three or more participants

- **WHEN** `entries.length >= 3`
- **THEN** the podium shows entries 1, 2, 3 in 2nd-1st-3rd order with their score and avatar

#### Scenario: Two participants

- **WHEN** `entries.length === 2`
- **THEN** the podium shows entries 1 and 2; the 3rd slot is empty

#### Scenario: One participant

- **WHEN** `entries.length === 1`
- **THEN** the podium shows only entry 1; the 2nd and 3rd slots are empty

#### Scenario: Zero participants

- **WHEN** `entries.length === 0`
- **THEN** the podium is not rendered and an empty-state message is shown instead

### Requirement: Sticky your-row card pinned below the podium

The Ranking panel SHALL render the viewer's row as a separate card directly below the podium, before the scrollable list, and SHALL NOT duplicate the row inside the list.

#### Scenario: Viewer is in the ranking

- **WHEN** the viewer has a finished attempt for the tryout
- **THEN** a card is rendered directly below the podium with the viewer's rank, name, score, and a "Kamu" indicator
- **AND** the scrollable list below shows only other users (rank 1..N excluding the viewer)

#### Scenario: Viewer is not in the ranking

- **WHEN** the viewer has no finished attempt for the tryout (defensive — should not happen in the pembahasan flow)
- **THEN** the sticky your-row card is not rendered
- **AND** the list shows the full ranking with no viewer indicator

### Requirement: Empty ranking state

The Ranking panel SHALL render a friendly message when `entries.length === 0`.

#### Scenario: No participants for this tryout

- **WHEN** the API returns `entries: []` and `participantCount: 0`
- **THEN** the panel renders "Belum ada peserta yang menyelesaikan tryout ini."

#### Scenario: Sticky your-row still shown for the only finisher

- **WHEN** the viewer is the only finisher (`entries.length === 1`, viewer is that one entry)
- **THEN** the podium shows only the viewer, the list is empty, and the empty-state message is NOT shown
