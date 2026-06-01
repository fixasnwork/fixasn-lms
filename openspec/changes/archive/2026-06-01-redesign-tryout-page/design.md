## Context

The tryout page (`app/(user)/tryout/page.tsx`) is 593 lines and currently shows:
- Trial card (special case)
- Flat list of all tryouts with locked/unlocked state
- Payment modal (select package → upload proof → success)
- Riwayat Tryout (attempt history)

Data sources (all via TanStack Query hooks):
- `usePackages()` → `Package[]`
- `useUserPayments(userId)` → `Payment[]`
- `useTryouts()` → `Record<string, Tryout[]>` (packageId → tryouts)
- `useAttemptHistory(userId)` → attempt records with tryoutId, totalScore

## Goals / Non-Goals

**Goals:**
- Group tryouts by package instead of flat list
- Show progress per package (X/Y completed)
- Show best score per tryout
- Clear separation: trial → buy section → owned packages
- "Beli" redirects to `/buy` page

**Non-Goals:**
- Changing API routes or data fetching
- Modifying payment flow (keep existing modal)
- Adding Lulus/Tidak Lulus labels
- Changing scoring logic

## Decisions

### 1. Data Derivation Strategy

Derive all display data from existing hooks — no new API calls.

```
packages ──────┐
               │
userPayments ──┼──▶ ownedPkgIds = payments
               │      .filter(p => p.status === "pending" || p.status === "verified")
               │      .map(p => p.packageId)
               │
tryoutBanks ───┼──▶ packageId → Tryout[]
               │
attemptHistory ┘──▶ bestScores = Map<tryoutId, totalScore>
                      (group by tryoutId, take max totalScore)
```

### 2. Component Structure

```
TryoutPage
├── TrialCard (existing, extracted)
├── AvailablePackages
│   └── PackageCard[] (unpurchased, with "Beli" → /buy)
└── OwnedPackages
    └── OwnedPackageCard[]
        ├── Header (name, progress X/Y)
        └── TryoutList
            └── TryoutRow[] (name, score, "Mulai" button)
```

### 3. Progress Calculation

```typescript
// For each owned package:
const tryouts = tryoutBanks[packageId] || [];
const completed = tryouts.filter(t => bestScores.has(t.id));
const progress = `${completed.length}/${tryouts.length}`;
```

### 4. Best Score Selection

```typescript
// Group attempts by tryoutId, take max totalScore
const bestScores = new Map<number, number>();
for (const attempt of attemptHistory) {
  const current = bestScores.get(attempt.tryoutId) || 0;
  if (attempt.totalScore > current) {
    bestScores.set(attempt.tryoutId, attempt.totalScore);
  }
}
```

### 5. Package Filtering

```typescript
const ownedPkgIds = userPayments
  .filter(p => p.status === "pending" || p.status === "verified")
  .map(p => p.packageId);

const availablePackages = packages.filter(
  p => p.isActive && !p.isTrial && !ownedPkgIds.includes(p.id)
);

const ownedPackages = packages.filter(
  p => p.isActive && !p.isTrial && ownedPkgIds.includes(p.id)
);
```

### 6. Payment Modal Removal

Current page has payment modal (select-package → payment → success). Since "Beli" now redirects to `/buy`, the payment modal can be removed entirely. This reduces page complexity significantly.

### 7. Trial Card Handling

Trial card stays at top, unchanged. It uses `trialTryout` (from `allTryouts.find(t => t.isTrial)`). The trial tryout has `isTrial: true` and synthetic id=0.

## Risks / Trade-offs

**Risk: attemptHistory type mismatch**
Current `useAttemptHistory` returns objects with `tryoutId`, `totalScore`, `id` — matches `TryoutAttempt` but store types it as `Payment[]`. May need type correction.

**Risk: Empty packageBanks**
If `tryoutBanks` hasn't loaded yet, package cards will show 0/0 progress. Loading state needed.

**Risk: Trial package in owned list**
Must explicitly exclude `isTrial` packages from both available and owned lists — trial is handled separately.

**Trade-off: Best score vs latest score**
Using best score means a user who scored 500 on attempt 1 and 300 on attempt 2 still shows 500. This is motivating but doesn't show recent performance. Decision: use best score (matches user request).
