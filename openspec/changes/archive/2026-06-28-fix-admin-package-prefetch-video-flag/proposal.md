## Why

The archived `2026-06-28-video-pembelajaran` change added the `Package.includesVideoPembelajaran` field end-to-end except for one server-side prefetch mapper. `app/admin/layout.tsx` prefetches `['packages']` into TanStack Query via `HydrationBoundary` and the prefetch mapper omitted the new field, so the admin client's first render read `pkg.includesVideoPembelajaran === undefined` → no "🎬 Video" badge, uncontrolled checkbox, and a React "changing uncontrolled to controlled" warning. The API and `usePackages` cache were correct — only the SSR prefetch was wrong.

While diagnosing, three related hardening gaps surfaced in the same data path and were fixed in the same pass:

1. **API mappers** (`app/api/packages/route.ts`, `app/api/packages/[packageId]/route.ts`) passed `pkg.includesVideoPembelajaran` through unchanged. Pre-migration rows with `NULL` (despite schema `@default(false)`) would have produced the same bug class. Coerce at the API boundary.
2. **Component state init** (`app/admin/settings/page.tsx` `PackageCard`, `BankCard`) read `useState(pkg.includesVideoPembelajaran)` directly. Same null/undefined hazard. Coerce at the component boundary.
3. **Client cache staleness** (`hooks/useTryoutQueries.ts` `usePackages` set `staleTime: 5 * 60_000`). Direct DB edits (Supabase Studio, `prisma db push`, manual SQL) had no invalidation hook, so the admin UI could show stale data for up to 5 minutes after a backend change. The `useUpdatePackage` mutation's `invalidateQueries` only covered edits made through the admin form. Drop `staleTime` so the admin always reads current DB state on mount.

## What Changes

- **Bug fix:** add `includesVideoPembelajaran: Boolean(p.includesVideoPembelajaran)` to the `['packages']` prefetch mapper in `app/admin/layout.tsx`. Mirrors the API route mapper exactly.
- **API hardening:** widen `mapPackage` input type to `boolean | null` and coerce output via `Boolean(pkg.includesVideoPembelajaran)` in `app/api/packages/route.ts` and `app/api/packages/[packageId]/route.ts`.
- **Component hardening:** coerce checkbox/text state init in `app/admin/settings/page.tsx` `PackageCard` (`isTrial`, `includesVideoPembelajaran`, `name`, `description`, `price`) and `BankCard` (`bankName`, `accountNumber`, `accountHolder`, `isActive`).
- **Data freshness:** remove `staleTime: 5 * 60_000` from `usePackages` in `hooks/useTryoutQueries.ts`. TanStack Query v5 default (`0`) makes the query always stale → refetches on mount.

No breaking changes. All changes are internal hardening on existing capabilities.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. The `video-pembelajaran` capability's requirements are correct as specified; this change only closes an implementation coverage gap (one mapper missed during the original change) and adds defensive coercion in the same data path. No requirement-level behavior changes — for healthy rows, `Boolean(true) === true` and `Boolean(false) === false`; for legacy `NULL` rows, behavior changes from "undefined → falsy UI" to "explicit `false`", which matches the schema's `@default(false)` contract.

## Impact

**Files modified (4):**

| File | Change |
|---|---|
| `app/admin/layout.tsx` | Add `includesVideoPembelajaran: Boolean(p.includesVideoPembelajaran)` to `['packages']` prefetch mapper. |
| `app/api/packages/route.ts` | Widen `mapPackage` input type for `includesVideoPembelajaran` to `boolean \| null`; coerce via `Boolean()`. |
| `app/api/packages/[packageId]/route.ts` | Same coercion as collection route. |
| `app/admin/settings/page.tsx` | `useState(Boolean(pkg.<field>))` for booleans; `useState(pkg.<field> ?? '')` for text; `useState(pkg.<field> ?? 0)` for price in `PackageCard` and `BankCard`. |
| `hooks/useTryoutQueries.ts` | Drop `staleTime: 5 * 60_000` from `usePackages`. |

**No schema changes.** No migration. No new API fields (the field was already exposed; only the value passing through was incomplete in one path).

**No test changes required** — existing 18 tests in `app/api/packages/route.test.ts` and `app/api/packages/[packageId]/route.test.ts` still pass (verified during fix). No new behavior to test beyond what's already covered.

**Diagnostic artifact added:** `scripts/diagnose-packages.ts` (untracked, used during diagnosis to confirm Prisma returns the correct value and type). Not part of the shipped change — can be deleted or kept as a one-off admin utility.
