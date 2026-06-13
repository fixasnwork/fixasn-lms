## Why

Admins need a quick visual of which packages drive demand. The current admin dashboard shows recent payments and top-level counts but no per-package popularity. The P2 analytics item adds a "Popularitas Paket" card to `/admin/dashboard`.

Code inspection shows `UserPurchase` exists but is not populated by the current payment flow; `Payment` is the active source of purchase activity today.

## What Changes

- Add a "Popularitas Paket" analytics card to `/admin/dashboard`.
- Show each non-deleted package with its purchase share percentage.
- Compute share from non-deleted payment records grouped by package, using `payments` as the current source of truth (`userPurchases` is not written anywhere today).
- Use primary blue (`#2563EB`) for the progress bar, 📦 emoji in the header, no raw purchase counts.
- Include a clear empty state when no package/payment data exists.
- No database schema changes.
- No user dashboard or staff route changes — card is admin-only, matching Vercel prototype 1:1.

## Capabilities

### New Capabilities
- `package-popularity-dashboard-card`: Admin dashboard package popularity analytics, including per-package share percentages, progress bar, empty state.

### Modified Capabilities

None.

## Impact

- `lib/packagePopularity.ts`: new shared server-only helper for computing popularity from payment records.
- `lib/types.ts`: add `PackagePopularityItem` type.
- `components/dashboard/PackagePopularityCard.tsx`: reusable card component (used only in admin dashboard).
- `app/admin/dashboard/page.tsx`: fetch popularity data and pass to `AdminDashboardClient`.
- `components/admin/AdminDashboardClient.tsx`: render the card alongside "Pembayaran Terbaru" in a 2-column grid on `md+`.
- `app/(user)/dashboard/page.tsx`: stripped to minimal — only `auth` read for user name, no package/payment data fetching, no popularity card. Matches prototype.
- `components/dashboard/DashboardHomeClient.tsx`: stripped of "Paket Tersedia" section and all package/payment props. Matches prototype.
- Tests: component coverage for popularity card ordering, percentages, and empty state. No staff/auth tests needed since card is admin-only.
