# Design: Ranking Score Filters

## Architecture

### Data Model

Extend `RankingEntry` interface in `lib/ranking.ts`:

```typescript
interface RankingEntry {
  userId: string;
  name: string;
  avatar: string | null;
  initials: string;
  totalScore: number;
  twkScore: number;    // NEW
  tiuScore: number;    // NEW
  tkpScore: number;    // NEW
  tryoutCount: number;
  packages: string;
}
```

### Aggregation Logic

**Global ranking** (`getRankingData`):

- For each user, for each tryout: pick the attempt with max `totalScore`
- Extract `twkScore`, `tiuScore`, `tkpScore` from that best attempt
- Sum each metric independently across tryouts
- Result: `RankingEntry` with all four scores

**Per-tryout ranking** (`getTryoutRanking`):

- Single tryout, one best attempt per user
- Extract sub-scores from that attempt
- Result: `RankingEntry` with all four scores

### Query Changes

**`getRankingData`** (lib/ranking.ts):

```sql
-- Current: select { userId, tryoutId, totalScore, updatedAt, user }
-- New:     select { userId, tryoutId, totalScore, twkScore, tiuScore, tkpScore, updatedAt, user }
```

Then in aggregation loop:

```typescript
// Track best attempt per (user, tryout)
const userTryoutBest = new Map<userId, Map<tryoutId, {
  totalScore: number;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  updatedAt: Date;
}>>();

// For each attempt, compare totalScore → keep best
// Extract all four scores from winning attempt

// After grouping:
const userRankings = userTryoutBest.entries().map(([userId, tryoutMap]) => {
  const totals = { totalScore: 0, twkScore: 0, tiuScore: 0, tkpScore: 0 };
  for (const attempt of tryoutMap.values()) {
    totals.totalScore += attempt.totalScore;
    totals.twkScore += attempt.twkScore;
    totals.tiuScore += attempt.tiuScore;
    totals.tkpScore += attempt.tkpScore;
  }
  return { userId, ...totals, tryoutCount: tryoutMap.size };
});
```

**`getTryoutRanking`** (lib/ranking.ts):

```sql
-- Current: select { userId, tryoutId, totalScore, finishedAt, user }
-- New:     select { userId, tryoutId, totalScore, twkScore, tiuScore, tkpScore, finishedAt, user }
```

Then extract sub-scores from best attempt per user.

### Client-Side Sorting

Both `RankingClient` and `TryoutRankingPanel`:

```typescript
type ScoreType = 'total' | 'twk' | 'tiu' | 'tkp';

const [scoreType, setScoreType] = useState<ScoreType>('total');

// Sort data by selected metric
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => {
    const aScore = a[`${scoreType}Score`];
    const bScore = b[`${scoreType}Score`];
    return bScore - aScore; // DESC
  });
}, [data, scoreType]);

// Extract selected score for display
const getDisplayScore = (entry: RankingEntry) => {
  return entry[`${scoreType}Score`];
};
```

### UI Components

**ScoreTypeBar** (new component in `RankingClient.tsx`):

```tsx
function ScoreTypeBar({ scoreType, setScoreType }) {
  const tabs = [
    { id: 'total', label: '📊 Total' },
    { id: 'twk', label: '📝 TWK' },
    { id: 'tiu', label: '🧮 TIU' },
    { id: 'tkp', label: '🧠 TKP' },
  ];
  // Render tab buttons, same style as TabBar
}
```

**Podium** (update):

```tsx
// Current: podiumTop3 = data.slice(0, 3), maxScore = data[0].totalScore
// New: podiumTop3 = sortedData.slice(0, 3), maxScore = sortedData[0][`${scoreType}Score`]
// Score display: getDisplayScore(entry) instead of entry.totalScore
```

**RankingRow** (update):

```tsx
// Current: shows entry.totalScore
// New: receives scoreType prop, shows entry[`${scoreType}Score`]
```

**TryoutRankingPanel** (update):

- Add `scoreType` state
- Add `ScoreTypeBar` below `TabBar`
- Sort entries client-side by `scoreType`
- Recompute viewer rank from sorted position
- Display viewer's score for selected `scoreType`

### Caching

No cache key changes. Sub-scores come along with the existing data:

- Global: `['ranking', 'all']`, `['ranking', 'weekly']`, `['ranking', 'monthly']`
- Per-tryout: `['tryout-ranking', tryoutId, period]`

Sorting happens client-side, no new API calls.

### Performance

- Client-side sort of ≤100 entries: negligible
- `useMemo` prevents re-sort on every render
- No additional DB queries or API calls

## Trade-offs

**Why Approach A (same-attempt sub-scores)?**

- Sub-scores always add up to `totalScore` → consistent mental model
- User who ranks #1 in Total also has the sub-scores that produced it
- Approach B (independent max) would allow cherry-picking different attempts for different subjects → confusing totals

**Why client-side sort?**

- Data already loaded (global page prefetches all periods; per-tryout API returns all entries)
- Instant tab switch, no loading states
- Simpler code, no new API endpoints or cache keys
- 100 entries is trivial to sort

**Why not server-side sort?**

- Would need new query param `?sortBy=twk`
- Would need cache key per (tryoutId, period, sortBy)
- Would need new API calls on tab switch → loading states
- No benefit over client-side for ≤100 entries

## Testing

- Update `lib/ranking.test.ts`: verify `RankingEntry` includes sub-scores
- Update `RankingClient.test.tsx` (if exists): verify score-type tabs render and sort
- Update `TryoutRankingPanel.test.tsx` (if exists): verify score-type tabs render and sort
- Verify podium re-orders when switching score types
- Verify viewer rank recomputes correctly
