## 1. API: Add GET handler for single tryout questions

- [x] 1.1 Add GET export to `app/api/tryouts/[tryoutId]/questions/route.ts` — parse tryoutId, validate, query questions with options, return `{ questions }` using existing `mapQuestion`
- [x] 1.2 Verify GET handler works: valid tryoutId returns questions, invalid returns 400, missing returns 404

## 2. Hook: Create `useTryoutQuestions` query hook

- [x] 2.1 Add `useTryoutQuestions(tryoutId: number | null)` to `hooks/useTryoutQueries.ts` — query key `['tryout-questions', tryoutId]`, staleTime 5min, enabled when tryoutId is truthy
- [x] 2.2 Export the hook for use in admin soal page

## 3. Page: Refactor admin soal page to per-tryout fetching

- [x] 3.1 Replace `useTryoutsWithQuestions()` with `useTryouts()` (light metadata) in `app/admin/soal/page.tsx`
- [x] 3.2 Call `useTryoutQuestions(currentTryoutId)` for the currently selected tryout, merge fetched questions into tryout object
- [x] 3.3 Update `allTryouts()` helper and `paidPackageBanks` to work with light tryout data (use `_questionCount` for tab badges instead of `questions.length`)
- [x] 3.4 Show loading spinner in questions area (not full page) when fetching questions for a new tryout
- [x] 3.5 Show loading spinner during initial page load (tryout metadata fetch)
- [x] 3.6 Update `invalidateTryouts()` to also invalidate `['tryout-questions', tryoutId]` for the current tryout

## 4. Cleanup

- [x] 4.1 Remove unused `useTryoutsWithQuestions` import from soal page (keep the hook in the file for other consumers)
- [x] 4.2 Run build to verify no type errors
