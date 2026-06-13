## Context

`/admin/dashboard` is a Server Component that fetches `Payment` and `Package` rows, then passes serialized data to `AdminDashboardClient`. The client renders the stat row and the "Pembayaran Terbaru" card.

The user dashboard (`/dashboard`) was stripped to match the Vercel prototype — no "Paket Tersedia" section, no package/payment data fetching, no popularity card. The card is admin-only.

## Goals / Non-Goals

**Goals:**

- Add a "Popularitas Paket" analytics card to `/admin/dashboard`.
- Show purchase share percentage for each non-deleted package.
- Base the first release on non-deleted `Payment` rows (payments are the active purchase source today).
- Use primary blue (`#2563EB`) for the progress bar, 📦 emoji in the header, no raw purchase counts.
- Display Pembayaran Terbaru and Popularitas Paket side-by-side on `md+` breakpoint.

**Non-Goals:**

- Add the card to the user dashboard or any staff route.
- Backfill or start writing `UserPurchase` rows.
- Change payment status semantics or access-control logic.
- Add charts, date filters, exports, or new admin analytics APIs.
- Add DB schema changes or migrations.

## Decisions

### Admin-only scope

The card lives only in `/admin/dashboard`. No staff route, no user dashboard changes. The user dashboard was stripped of "Paket Tersedia" and all package/payment data to match the prototype.

### Use `Payment` as current source of truth

Count non-deleted `Payment` rows grouped by `packageId`. Include all statuses. `UserPurchase` is not populated by the current write path.

### Compute popularity server-side in a shared helper

`lib/packagePopularity.ts` queries Prisma and returns display-ready rows. The admin dashboard page calls it and passes results to `AdminDashboardClient`.

```ts
export interface PackagePopularityItem {
  packageId: number;
  packageName: string;
  purchaseCount: number;
  purchaseShare: number; // whole percent, 0-100
}
```

### Side-by-side layout on tablet/desktop

Both cards sit in `grid grid-cols-1 md:grid-cols-2 gap-5.5` — stacked on mobile, equal columns on `md+`.

### Styling

- 📦 emoji header, primary blue progress bar (`#2563EB`).
- No raw purchase count shown — only percentage.
- Same rounded-card style as existing Pembayaran Terbaru.

## Risks / Trade-offs

- Payment rows can include pending/blocked status → percentages represent payment activity, not confirmed revenue. Label: `pembelian tercatat`.
- Percent rounding can total 99% or 101% → display whole-number percentages per package; tests assert individual calculations, not summed total.
- `UserPurchase` remains stale/unused → documented as out of scope.

## Migration Plan

No migration required. Deploy changes; rollback by reverting the card from admin dashboard and restoring user dashboard data fetching. No persistent data changes.

## Open Questions

None.
