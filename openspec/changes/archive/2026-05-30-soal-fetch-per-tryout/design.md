## Context

Admin soal page (`app/admin/soal/page.tsx`) uses `useTryoutsWithQuestions()` which calls `GET /api/tryouts?include=questions`. This returns ALL tryouts grouped by package, each with ALL questions + options embedded. Result: large payload, slow initial load.

The API already supports a light query (metadata only, no questions) and a full query (all questions). There's also an existing `POST /api/tryouts/[tryoutId]/questions` route for creating questions, but no GET handler on that route.

React Query is already in use for data fetching. The project uses `@tanstack/react-query`.

## Goals / Non-Goals

**Goals:**
- Fetch questions only for the currently active tryout (on-demand)
- Cache fetched questions so switching between previously-viewed tryouts is instant (no re-fetch)
- Keep tryout metadata (names, durations, question counts) available upfront for tab rendering
- Minimal changes — reuse existing API patterns and React Query infrastructure

**Non-Goals:**
- Changing the dashboard/user-facing tryout pages (they have different needs)
- Pagination of questions (question count per tryout is manageable)
- Real-time updates or WebSocket-based sync

## Decisions

### 1. Add GET handler to existing `/api/tryouts/[tryoutId]/questions` route

**Why**: The route already exists for POST. Adding GET is natural and keeps question operations co-located. No new route file needed.

**Alternative considered**: New `/api/tryouts/[tryoutId]/questions/list` route — rejected, unnecessary indirection.

**Response shape**: Return `{ questions: Question[] }` array directly. Reuse the same `mapQuestion` mapper already in the POST handler.

### 2. Keep light tryout list query for metadata

**Why**: The page needs tryout names, durations, question counts to render tabs — even before questions are fetched. Use existing `useTryouts()` (light mode) for this. It returns `_questionCount` per tryout.

**Change needed**: `useTryoutsWithQuestions()` is removed from the soal page. `useTryouts()` stays.

### 3. New `useTryoutQuestions(tryoutId)` hook with React Query caching

**Why**: One hook per tryout, keyed by `['tryout-questions', tryoutId]`. React Query's default `staleTime` keeps data around — switching back to a previously-viewed tryout hits cache instantly.

**Query key**: `['tryout-questions', tryoutId]`
**staleTime**: 5 minutes (questions don't change often during a single admin session)
**enabled**: `!!tryoutId` (don't fetch if no tryout selected)

### 4. Merge cached questions into tryout objects on the client

**Why**: The page code expects `tryout.questions` to be populated. After fetching questions for a tryout, merge them into the tryout object from the light query. This minimizes changes to existing rendering logic.

**Approach**: In the page component, build `currentTryout` by combining light metadata + fetched questions from the per-tryout query.

## Risks / Trade-offs

- **[Stale question count]** The light query shows `_questionCount` which reflects count at fetch time. After adding/deleting questions, the count in the tab badge won't update until the light query is invalidated. → Mitigation: `invalidateTryouts()` already invalidates `['tryouts']` query key on mutations. The light query is keyed `['tryouts']` so it will refetch.
- **[Flash of empty state]** When switching to a new tryout, there's a brief loading state while questions fetch. → Mitigation: Show loading indicator in the questions area only (not full page). Questions for small tryouts load in <200ms.
- **[Trial tryout special case]** Trial tab shows a single tryout. Same pattern applies — fetch questions for trial tryout ID on demand.
