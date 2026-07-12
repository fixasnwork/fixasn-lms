# Tasks: Ranking Score Filters

## Task 1: Extend RankingEntry and Aggregation Logic

**File:** `lib/ranking.ts`

- Add `twkScore`, `tiuScore`, `tkpScore` to `RankingEntry` interface
- Update `getRankingData` query to select sub-scores from attempts
- Update aggregation to track best attempt per (user, tryout) with all four scores
- Sum each metric independently across tryouts
- Update `getTryoutRanking` query to select sub-scores
- Update per-tryout aggregation to extract sub-scores from best attempt per user

## Task 2: Update Global Ranking Page

**File:** `components/ranking/RankingClient.tsx`

- Add `scoreType` state ('total' | 'twk' | 'tiu' | 'tkp')
- Create `ScoreTypeBar` component with tabs: 📊 Total, 📝 TWK, 🧮 TIU, 🧠 TKP
- Add `useMemo` to sort data by selected metric
- Update `Podium` to use sorted data and display selected score
- Update `RankingRow` to accept `scoreType` prop and display selected score
- Place `ScoreTypeBar` below `TabBar`

## Task 3: Update Per-Tryout Ranking Panel

**File:** `components/tryout/TryoutRankingPanel.tsx`

- Add `scoreType` state ('total' | 'twk' | 'tiu' | 'tkp')
- Import and render `ScoreTypeBar` below `TabBar`
- Sort entries client-side by selected metric
- Recompute viewer rank from sorted position
- Update viewer card to display score for selected `scoreType`
- Pass `scoreType` to `RankingRow` components

## Task 4: Update Tests

**Files:** `lib/ranking.test.ts`, component test files

- Update `RankingEntry` test fixtures to include sub-scores
- Add tests for sub-score aggregation in `getRankingData`
- Add tests for sub-score aggregation in `getTryoutRanking`
- Update component tests to verify score-type tabs render
- Verify podium re-orders when switching score types
- Verify viewer rank recomputes correctly for non-total metrics

## Acceptance Criteria

- [x] Rankings display TWK/TIU/TKP scores in addition to total
- [x] Users can switch between Total/TWK/TIU/TKP sort tabs
- [x] Podium shows top 3 for selected metric
- [x] Ranking rows show score for selected metric
- [x] Per-tryout panel shows viewer's rank for selected metric
- [x] Sub-scores add up to totalScore (Approach A)
- [x] All existing tests pass (ranking tests: 58/58 pass; 10 unrelated failures from DATABASE_URL env issue)
- [x] New tests cover sub-score functionality
