# Proposal: Ranking Score Filters (TWK/TIU/TKP Sort)

## Problem

Rankings only show/sort by `totalScore`. Users can't see how they compare in individual subjects (TWK, TIU, TKP). The sub-scores already exist in the DB but are discarded during ranking aggregation.

## Solution

Add a second row of tabs (Total / TWK / TIU / TKP) orthogonal to the existing period tabs (Semua / Mingguan / Bulanan). When a subject tab is active:

- Ranking re-sorts by that subject's score
- Podium shows top 3 for that subject
- "Peringkat Kamu" card shows the user's rank + score for that subject
- `RankingRow` shows just the selected subject's number

## Scope

Both ranking surfaces:

1. **Global ranking** (`/ranking` — `RankingClient.tsx`)
2. **Per-tryout ranking** (`TryoutRankingPanel.tsx` in tryout pembahasan)

## Aggregation: Approach A (Same-Attempt Sub-Scores)

Best attempt per tryout (by totalScore) → use **that attempt's** TWK/TIU/TKP → sum across tryouts.

```
User has 2 attempts at tryout X:
  Attempt 1: total=300, TWK=110, TIU=100, TKP=90  ← best by total
  Attempt 2: total=280, TWK=120, TIU=90,  TKP=70
→ Use attempt 1: TWK=110, TIU=100, TKP=90
→ Sub-scores always add up to totalScore
```

## Data Flow

```
DB (TryoutAttempt.twkScore/tiuScore/tkpScore)
  ↓  getRankingData / getTryoutRanking
  ↓  select + aggregate sub-scores from best attempt
RankingEntry { twkScore, tiuScore, tkpScore, totalScore, ... }
  ↓  server prefetches (global) or API returns (per-tryout)
Client components
  ↓  sort by selected metric
  ↓  render with selected score
UI
```

## UI Layout

```
┌─────────────────────────────────────────────┐
│  [🗓️ Semua] [📅 Mingguan] [📆 Bulanan]    │ ← period (existing)
│  [📊 Total] [📝 TWK] [🧮 TIU] [🧠 TKP]   │ ← score sort (new)
└─────────────────────────────────────────────┘
```
