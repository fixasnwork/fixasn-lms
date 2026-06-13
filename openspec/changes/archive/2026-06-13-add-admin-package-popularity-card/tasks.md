## 1. Preparation

- [x] 1.1 Read relevant Next.js App Router docs in `node_modules/next/dist/docs/` for server/client component data boundaries before changing dashboard code.
- [x] 1.2 Inspect `app/admin/dashboard/page.tsx`, `components/admin/AdminDashboardClient.tsx`, `app/admin/layout.tsx`, `app/login/page.tsx`, `lib/deviceSession.ts`, `lib/types.ts`, and existing auth/admin component tests.

## 2. Shared Data Preparation

- [x] 2.1 Add a `PackagePopularityItem` type in `lib/types.ts`.
- [x] 2.2 Add a shared server-side helper `lib/packagePopularity.ts` that fetches non-deleted packages and non-deleted payments, then computes package popularity from payment counts grouped by `packageId`.
- [x] 2.3 Calculate `purchaseShare` as whole-number percentage of total counted payments, with zero-safe handling when total is `0`.
- [x] 2.4 Sort popularity rows by `purchaseCount` descending, then stable package identifier/name order.

## 3. Shared UI Component

- [x] 3.1 Create a reusable "Popularitas Paket" card component (`components/dashboard/PackagePopularityCard.tsx`).
- [x] 3.2 Show package name and purchase share percentage for each row. Do not show raw purchase counts.
- [x] 3.3 Use 📦 emoji in the card header.
- [x] 3.4 Use primary blue (`#2563EB`) for the progress bar.
- [x] 3.5 Render a clear empty or zero state when there are no counted payments, without `NaN` or `Infinity`.
- [x] 3.6 Use existing rounded-card styling.

## 4. Admin Dashboard Integration

- [x] 4.1 Update `app/admin/dashboard/page.tsx` to call `getPackagePopularity()` and pass data to `AdminDashboardClient`.
- [x] 4.2 Update `AdminDashboardClient` to render the popularity card alongside "Pembayaran Terbaru" in a 2-column grid on `md+`.

## 5. User Dashboard Cleanup

- [x] 5.1 Remove "Paket Tersedia" section from `components/dashboard/DashboardHomeClient.tsx`.
- [x] 5.2 Remove all package/payment data fetching and props from `app/(user)/dashboard/page.tsx` and `DashboardHomeClient.tsx`.
- [x] 5.3 Match Vercel prototype — only `auth` read for user name, no extra DB queries.

## 6. Tests and Validation

- [x] 6.1 Add component tests for package popularity ordering, percentages, and empty state.
- [x] 6.2 Verify all existing tests still pass.
- [x] 6.3 Run `npm run lint`.
