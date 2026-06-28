## 1. Bug Fix — Admin Layout Prefetch

- [x] 1.1 Add `includesVideoPembelajaran: Boolean(p.includesVideoPembelajaran)` to the `['packages']` prefetch mapper in `app/admin/layout.tsx`
- [x] 1.2 Verify the field is hydrated correctly by hard-refreshing `/admin/settings` and checking that "🎬 Video" badge + checkbox reflect `true` for `Paket Video Belajar`

## 2. API Boundary Hardening

- [x] 2.1 Widen `mapPackage` input type for `includesVideoPembelajaran` to `boolean | null` in `app/api/packages/route.ts`
- [x] 2.2 Coerce output via `Boolean(pkg.includesVideoPembelajaran)` in `app/api/packages/route.ts`
- [x] 2.3 Widen and coerce `mapPackage` in `app/api/packages/[packageId]/route.ts` (same as 2.1 + 2.2)
- [x] 2.4 Run `npx vitest run app/api/packages/` — confirm 18/18 tests still pass

## 3. Component Boundary Hardening

- [x] 3.1 In `app/admin/settings/page.tsx` `PackageCard`: coerce `useState(Boolean(pkg.<field>))` for `isTrial` and `includesVideoPembelajaran`; add `??` fallbacks for `name`, `description`, `price`
- [x] 3.2 In `app/admin/settings/page.tsx` `BankCard`: same defensive treatment for `bankName`, `accountNumber`, `accountHolder`, `isActive`
- [x] 3.3 Run `npx tsc --noEmit` — confirm typecheck clean

## 4. Data Freshness

- [x] 4.1 Remove `staleTime: 5 * 60_000` from `usePackages` in `hooks/useTryoutQueries.ts`
- [x] 4.2 Verify TanStack Query v5 default `staleTime: 0` is in effect (no other `staleTime` overrides in this hook)

## 5. Diagnostic

- [x] 5.1 Add `scripts/diagnose-packages.ts` to query Prisma directly and confirm `includesVideoPembelajaran` type/value
- [x] 5.2 Confirm Prisma returns `true` (typeof `boolean`) for `Paket Video Belajar` (id=4) and `null` is not present in active rows
- [x] 5.3 Confirm `curl http://localhost:3000/api/packages` returns `"includesVideoPembelajaran": true` for that package
