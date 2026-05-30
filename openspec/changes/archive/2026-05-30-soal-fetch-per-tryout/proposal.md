## Why

Admin soal page fetches ALL questions for ALL tryouts across ALL packages in one API call (`GET /api/tryouts?include=questions`). This is slow on initial load and wastes bandwidth — admin only needs questions for the one tryout they're viewing. As question bank grows, this gets worse.

## What Changes

- Replace single bulk-fetch (`useTryoutsWithQuestions`) with per-tryout fetch: only load questions for the currently selected tryout
- Add GET handler to `/api/tryouts/[tryoutId]/questions` so questions can be fetched for a single tryout
- Keep tryout metadata (names, durations, question counts) fetched upfront via existing light query (no questions)
- Cache fetched questions in React Query so navigating between tryouts/packages doesn't re-fetch

## Capabilities

### New Capabilities
- `per-tryout-question-fetch`: Fetch questions on-demand per tryout instead of bulk, with client-side caching

### Modified Capabilities

## Impact

- `app/api/tryouts/[tryoutId]/questions/route.ts` — add GET handler
- `hooks/useTryoutQueries.ts` — new `useTryoutQuestions(tryoutId)` hook
- `app/admin/soal/page.tsx` — refactor to use per-tryout fetch + cached data
