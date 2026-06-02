# Code Context: Soft-Deleted Package Reappears on Hard Refresh

## Root Cause

**`admin/layout.tsx` server prefetch (line 35) omits `deletedAt: null` filter** — fetches ALL packages including soft-deleted ones. Hard refresh rehydrates these into client cache, making deleted packages reappear.

## Flow Trace

1. Hard refresh → `admin/layout.tsx` runs server-side
2. Prefetches `['packages']` via `prisma.package.findMany()` **without** `where: { deletedAt: null }` (line 33-39)
3. `dehydrate`/`HydrationBoundary` passes this data (including soft-deleted packages) to client React Query cache
4. `usePackages()` hook (`hooks/useTryoutQueries.ts` line 190) finds cached data, `staleTime: 5 * 60_000` means no refetch
5. UI renders soft-deleted package

After delete mutation (optimistic filter + invalidate), UI updates correctly immediately. But hard refresh re-runs server prefetch → deleted package comes back.

## Files Retrieved

1. `app/admin/layout.tsx` (lines 27-52) — **BUG LOCATION**: server prefetch uses `prisma.package.findMany()` without `deletedAt` filter
2. `app/api/packages/route.ts` (lines 27-31) — GET route **correctly** filters `where: { deletedAt: null }`
3. `app/api/packages/[packageId]/route.ts` (lines 72-113) — DELETE route correctly soft-deletes via `deletedAt: new Date()`
4. `hooks/useTryoutQueries.ts` (lines 190-200, 339-353) — `usePackages()` with `staleTime: 5min`; `useDeletePackage()` with optimistic update + invalidate
5. `lib/queryClient.ts` — server `QueryClient` config
6. `prisma/schema.prisma` (lines 95-120) — `Package` model has `deletedAt DateTime?`

## Key Code

### Bug — `admin/layout.tsx` lines 33-39
```ts
queryClient.prefetchQuery({
  queryKey: ['packages'],
  queryFn: async () => {
    const data = await prisma.package.findMany({ orderBy: { id: 'asc' } });
    // ^^ No where clause — includes soft-deleted packages
    return data.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
  },
});
```

### Correct filter — `app/api/packages/route.ts` lines 27-28
```ts
const data = await prisma.package.findMany({
  where: { deletedAt: null },
  ...
});
```

## Architecture

```
admin/layout.tsx (server)           → Prisma direct query (BUG: no deletedAt filter)
                                    → dehydrate → HydrationBoundary → client React Query cache
                                    ↓
app/admin/settings/page.tsx (client) → usePackages() reads ['packages'] from cache
                                      staleTime 5min → no refetch on mount
```

The GET API route (`app/api/packages/route.ts`) is correct. The client hook is fine. The delete mutation is fine. Only the server prefetch in the admin layout misses the filter.

## Start Here

Fix `app/admin/layout.tsx` line 35. Change:

```ts
const data = await prisma.package.findMany({ orderBy: { id: 'asc' } });
```

To:

```ts
const data = await prisma.package.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
```

## One-Line Fix

`app/admin/layout.tsx` line 35: Add `where: { deletedAt: null }` to the `prisma.package.findMany()` call inside the `['packages']` prefetch query.

## Additional Risks

- `admin/layout.tsx` also prefetches `['admin-payments']` (line 30). Check if `Payment` model also has `deletedAt` — unlikely related but worth verifying if payments show ghost records too.
- No other server prefetch in project fetches packages aside from this layout.
