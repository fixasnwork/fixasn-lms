## Why

The current tryout page shows a flat list of all tryouts (locked/unlocked) with a separate "Riwayat Tryout" section. This doesn't align with how users think about their learning journey — they think in **packages**, not individual tryouts.

Problems with current design:
- Users can't see their progress per package
- Locked/unlocked state is per-tryout, not per-package
- Purchase flow requires clicking a locked tryout first
- No clear separation between owned and unowned content

## What Changes

Redesign `app/(user)/tryout/page.tsx` to show three distinct sections:

1. **Trial card** (always on top) — unchanged, shows free trial tryout
2. **Available packages** — unpurchased packages with "Beli" button that redirects to `/buy`
3. **Paket Tryout Kamu** — owned packages showing:
   - Package name
   - Progress: X/Y tryout selesai (based on best attempt per tryout)
   - List of tryouts with score (or "Belum dikerjakan") and "Mulai" button

Key behavior changes:
- "Beli" redirects to `/buy` page (no modal)
- "Mulai" button starts/resumes tryout (same as current)
- Progress uses best attempt score when multiple attempts exist
- No Lulus/Tidak Lulus labels (just show score)
- Trial card always visible, unpurchased packages only shown if not owned

## Capabilities

### New Capabilities
- `package-centric-tryout-view`: Redesign tryout page to show packages as primary grouping, with progress tracking and per-tryout score display

### Modified Capabilities
<!-- None — this is a UI redesign, no spec-level behavior changes to existing capabilities -->

## Impact

**Files to modify:**
- `app/(user)/tryout/page.tsx` — main page component (593 lines, major rewrite)

**Files to read/reference:**
- `hooks/useTryoutQueries.ts` — existing hooks (usePackages, useUserPayments, useTryouts, useAttemptHistory)
- `lib/types.ts` — Package, Tryout, Payment, TryoutAttempt types
- `lib/scoring.ts` — scoring logic reference
- `app/(user)/buy/page.tsx` — redirect target for "Beli" button

**No API changes needed** — all required data is already fetched by existing hooks.

**Dependencies:**
- TanStack Query hooks already return required data
- `/buy` page already exists and handles package selection
- Payment flow unchanged (reuse existing modal from current page)
