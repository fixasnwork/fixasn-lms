## Why

User-facing package pages show inconsistent catalog state: deleted/deactivated packages can appear from stale client data, `Paket Starter` is hidden even when active, and already purchased packages can still look buyable.

## What Changes

- User package catalog pages only show active, non-deleted packages from API/DB-backed data.
- `Paket Starter` is treated as an active paid package and appears in buy, payment, dashboard, and tryout package lists.
- Buy page detects pending/verified payments and marks owned packages as `Dimiliki` with a visible, non-truncated indicator and disabled purchase action.
- Payment flow uses API package/bank data so package IDs match DB records.

## Capabilities

### New Capabilities
- `user-package-catalog`: User-facing package catalog visibility, ownership indicators, and payment package selection.

### Modified Capabilities

## Impact

- Affected pages: `app/(user)/buy/page.tsx`, `app/(user)/payment/page.tsx`, `app/(user)/tryout/page.tsx`, `app/(user)/dashboard/page.tsx`, `app/(user)/layout.tsx`.
- Affected component: `components/dashboard/DashboardHomeClient.tsx`.
- Affected seed defaults: `data/packages.ts`.
- No API contract or dependency changes.
