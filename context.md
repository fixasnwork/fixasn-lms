# Code Path Comparison: "finished tryout" count disagreement

## Files Examined

1. `app/api/users/me/dashboard/route.ts` — Dashboard API (Path A)
2. `app/(user)/tryout/page.tsx` — Tryout page (Path B)
3. `hooks/useTryoutQueries.ts` — `useUserPayments`, `useAttemptHistory`, `usePackages`, `useTryouts`
4. `lib/availability.ts` — `isAvailable`, `isPackageAvailable`, `getEntityStatus`
5. `app/api/payments/route.ts` — Payments API (called by `useUserPayments`)
6. `app/api/tryout-attempts/route.ts` — Attempt history API (called by `useAttemptHistory`)
7. `app/api/packages/route.ts` — Packages API (called by `usePackages`)
8. `app/api/tryouts/route.ts` — Tryouts API (called by `useTryouts`)
9. `lib/types.ts` — `Package` and `Tryout` type definitions

## Side-by-Side Comparison

| Aspect | Dashboard `route.ts` | Tryout page |
|---|---|---|
| **Payment source** | Direct Prisma query `prisma.payment.findMany` with `status: { in: ['pending','verified'] }`, `package: { deletedAt: null }` (lines 61-69) | `useUserPayments` → `GET /api/payments?userId=X` → ALL payments for user (no DB status filter). Client-side filters `.filter(p => p.status === 'pending' \|\| p.status === 'verified')` (line 327-329). No `deletedAt` check on packages in the filter |
| **Status filter** | `['pending', 'verified']` in DB WHERE (line 65) | Same values but client-side: `.filter(p => p.status === "pending" \|\| p.status === "verified")` (line 328) |
| **Package `deletedAt` check** | IN DB QUERY: `package: { deletedAt: null }` (line 66). No further check needed in loop | NOT in payment filter. BUT: `activeOwnedPkgIds` uses `packages.find()` which comes from `usePackages` → `GET /api/packages` filters `deletedAt: null`. So deleted packages are implicitly excluded because they won't be found (line 362-364) |
| **Tryout `deletedAt` check** | Loop line 89: `if (pt.tryout.deletedAt !== null) continue` | Implicit: `tryoutBanks` from `useTryouts` → `GET /api/tryouts` filters `deletedAt: null` (tryouts route line 373). So tryouts with `deletedAt` set never appear in the mapping |
| **Package date availability check** | Lines 83-84: `if (startDate && endDate) ? isAvailable(pkg) : true` — **null+null → true (available)** | Line 363: `isPackageAvailable(pkg)` — **null+null → `false` (inactive)** via `getEntityStatus` |
| **Tryout date availability check** | Lines 90-91: `if (startDate && endDate) ? isAvailable(tryout) : true` — null+null → true | No equivalent check in `finishedAttempts` filter; `tryoutBanks` returns all non-deleted tryouts regardless of date; but display uses `isAvailable(t)` for owned tryout cards (line 126) |
| **Null-date handling pattern** | Override: `date1 && date2 ? isAvailable(x) : true` | No override: uses `isAvailable` / `isPackageAvailable` directly |
| **Trial tryout handling** | Only visible if linked to a paid package via Payment→Package→PackageTryout chain (same as any tryout) | Special trial card at top (lines 99-121). `finishedAttempts` fallback for `!pkgInfo` returns `true` if any active owned packages exist (line 374-376) |
| **Attempt `deletedAt` filter** | Lines 104-105: `where: { userId, deletedAt: null }` — **explicit** | `useAttemptHistory` → `GET /api/tryout-attempts?userId=X` — **NO `deletedAt` filter** (tryout-attempts route line 30-32) |
| **Attempt scope for "completed" count** | Filtered by `activeTryoutIds` (only tryouts from active+owned packages) (lines 114-117) | Filtered by `activeOwnedPkgIds` (lines 370-381). Also uses `tryoutToPackage` mapping which maps tryoutId → packageId |

## Root Cause: The Exact Disagreement

**Dashboard** counts a finished attempt when the package has **both `startDate=null` and `endDate=null`** (unrestricted package). The tryout page **excludes** it.

The chain:

1. **Dashboard lines 83-84**: When both `startDate` and `endDate` are null on a package:
   ```ts
   p.package.startDate && p.package.endDate  // null && null → falsy
   // → pkgAvailable = true  (the `: true` branch)
   ```
   Package is considered available → tryoutIds in that package are added to `activeTryoutIds`.

2. **Tryout page line 361-365**:
   ```ts
   const activeOwnedPkgIds = ownedPkgIds.filter((pid) => {
     const pkg = packages.find((p) => p.id === pid);
     return pkg ? isPackageAvailable(pkg) : false;  // null+null → false
   });
   ```
   `isPackageAvailable` (aliased to `isAvailable`) calls `getEntityStatus` which returns `"inactive"` for `{startDate: null, endDate: null}` → returns `false`. Package excluded from `activeOwnedPkgIds`.

3. **Tryout page line 378**: `activeOwnedPkgIds.includes(pkgInfo.packageId)` → `false` → attempt excluded from `finishedAttempts`.

**Result**: Dashboard shows `distinctFinishedTryouts = 1`, tryout page shows 0 finished attempts.

## Why `isAvailable(null, null)` returns `false`

From `lib/availability.ts` `getEntityStatus` (lines 50-72):
```
Both null → "inactive" → isAvailable returns false
```

The dashboard code has a COMMENT acknowledging this (lines 78-82):
```
// `isAvailable` alone returns false for null+null, which excludes
// unrestricted packages — see `getEntityStatus` in lib/availability.ts.
```

Then deliberately works around it with the `? true :` pattern. The tryout page does NOT have this workaround.

## Secondary (but less impactful) differences

- **Attempt `deletedAt`**: Dashboard filters `deletedAt: null` on attempts; tryout page API doesn't. Would only matter if attempts are soft-deleted.
- **Trial fallback** (tryout page line 374-376): If `tryoutToPackage` has no mapping for a tryout, the fallback includes it if any `activeOwnedPkgIds` exist. The dashboard has no equivalent — trial tryouts only count if they're in a paid package's tryout list.

## Recommended Minimal Fix

**Change exactly one thing**: Align the tryout page's `activeOwnedPkgIds` filter with the dashboard's null-date handling.

In `app/(user)/tryout/page.tsx`, change lines 362-364 from:
```ts
return pkg ? isPackageAvailable(pkg) : false;
```
to:
```ts
if (!pkg) return false;
return (pkg.startDate && pkg.endDate) ? isPackageAvailable(pkg) : true;
```

This makes the tryout page treat null+null-dated packages the same way the dashboard does: as "always available." The `isPackageAvailable` call is preserved for packages that DO have dates, so the tryout page still respects date windows when they're set.

Alternatively, fix `availability.ts` `getEntityStatus` to return `"active"` for null+null. But that has wider blast radius (affects all callers including POST creation gates, rendering filters, etc.), so the targeted fix is safer.
