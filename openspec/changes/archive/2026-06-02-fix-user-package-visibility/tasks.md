## 1. Data Source Alignment

- [x] 1.1 Update buy page to load packages from `usePackages()` instead of Zustand defaults
- [x] 1.2 Update payment page to load packages and banks from API-backed query hooks
- [x] 1.3 Update user layout package prefetch to exclude soft-deleted packages
- [x] 1.4 Update dashboard package query to exclude soft-deleted packages

## 2. Package Visibility

- [x] 2.1 Remove package-level `!isTrial` exclusions from user package lists
- [x] 2.2 Ensure active `Paket Starter` appears in buy, payment, dashboard, and tryout package lists
- [x] 2.3 Update default package seed data so `Paket Starter` is not marked as package trial

## 3. Ownership Indicator

- [x] 3.1 Derive owned package IDs on buy page from pending or verified user payments
- [x] 3.2 Render owned packages with `Dimiliki` indicator
- [x] 3.3 Position `Dimiliki` indicator so it is fully visible and not truncated
- [x] 3.4 Disable purchase action for owned packages

## 4. Verification

- [x] 4.1 Run `npm run lint`
- [x] 4.2 Run `npm run build`
