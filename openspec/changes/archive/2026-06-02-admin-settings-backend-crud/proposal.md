## Why

Admin settings currently edits package and bank-account data through client-side Zustand state, so changes do not reliably persist to the real database. Admins also cannot create/delete packages, manage tryouts inside packages, or perform full tryout CRUD from settings.

## What Changes

- Add full database-backed CRUD for packages from the admin settings route.
- Add full database-backed CRUD for tryouts from admin settings, including name, trial flag, sort order, and duration.
- Add package-to-tryout assignment management so admins can choose which tryouts belong to each package.
- Replace destructive package full-replacement writes with single-row create/update/delete APIs.
- Block package deletion when linked payment or purchase records exist.
- Wire bank-account settings to database-backed API calls for create/read/update/delete.
- Soft-delete bank accounts instead of hard-deleting rows.
- Update settings UI to use React Query fetch/mutation patterns and invalidate affected package, tryout, and bank queries after mutations.
- Keep server-prefetched admin package data consistent with API filtering so soft-deleted packages do not reappear after hard refresh.
- Expose unassigned tryouts in admin settings so newly created tryouts remain manageable before package assignment.
- Ensure assigned trial tryouts can appear inside paid-package question-bank tabs and remain synced when shared across packages.

## Capabilities

### New Capabilities
- `admin-settings-catalog-management`: Admins can manage packages, tryouts, package-tryout assignments, and payment bank accounts from the settings page using persistent backend APIs.

### Modified Capabilities
- None.

## Impact

- Affected pages: `app/admin/settings/page.tsx`, `app/admin/soal/page.tsx`, `app/admin/layout.tsx`.
- Affected API routes: `app/api/packages/**`, `app/api/tryouts/**`, `app/api/banks/**`.
- Affected hooks: React Query hooks for packages, tryouts, package assignments, and bank accounts, including flat all-tryouts reads.
- Affected data models: Prisma `Package`, `Tryout`, `PackageTryout`, `BankAccount`, `Payment`, `UserPurchase`.
- No new runtime dependencies expected.
