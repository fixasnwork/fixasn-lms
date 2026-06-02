## 1. Package APIs

- [x] 1.1 Replace bulk package persistence with package mappers, validation helpers, and non-deleted filtering in `app/api/packages/route.ts`.
- [x] 1.2 Add `POST /api/packages` for admin-only package creation with validation and unique-name conflict handling.
- [x] 1.3 Add `app/api/packages/[packageId]/route.ts` with admin-only `PUT` for single-package updates.
- [x] 1.4 Add admin-only package `DELETE` that blocks when linked `Payment` or `UserPurchase` records exist, otherwise soft-deletes package and removes `PackageTryout` links.
- [x] 1.5 Update or add package route tests for create, update, non-deleted reads, delete blocking, soft-delete success, and auth rejection.

## 2. Tryout APIs and Package Assignments

- [x] 2.1 Update `GET /api/tryouts` and related tryout reads to exclude soft-deleted tryouts and keep existing grouped response shape.
- [x] 2.2 Add admin-only `POST /api/tryouts` for tryout creation with name, `isTrial`, `sortOrder`, and `durationMin` validation.
- [x] 2.3 Extend `app/api/tryouts/[tryoutId]/route.ts` with `GET`, `PUT`, and `DELETE` while preserving existing duration update behavior.
- [x] 2.4 Implement tryout `DELETE` to block when linked `TryoutAttempt` records exist, otherwise soft-delete tryout and remove `PackageTryout` links.
- [x] 2.5 Add `app/api/packages/[packageId]/tryouts/route.ts` with `GET` assigned tryouts and admin-only atomic `PUT` assignment replacement.
- [x] 2.6 Make assignment replacement validate package and tryout ids, leave assignments unchanged on error, and update `Package.tryoutCount` on success.
- [x] 2.7 Add tryout and package-assignment route tests for CRUD, validation, deletion blocking, assignment replacement, and auth rejection.

## 3. Bank Account APIs

- [x] 3.1 Update `GET /api/banks` so default reads return active non-deleted banks for users and admin-scoped reads return non-deleted banks including inactive accounts.
- [x] 3.2 Add admin-only `POST /api/banks` for bank creation with validation and unique bank-name/account-number conflict handling.
- [x] 3.3 Add `app/api/banks/[bankId]/route.ts` with admin-only `PUT` for single-bank updates.
- [x] 3.4 Add admin-only bank `DELETE` that soft-deletes by setting `deletedAt` and excludes deleted banks from later reads.
- [x] 3.5 Update or add bank route tests for default/admin reads, create, update, soft delete, conflict handling, and auth rejection.

## 4. React Query Hooks

- [x] 4.1 Add or update package hooks for create, update, delete, and query invalidation.
- [x] 4.2 Add tryout hooks for create, update, delete, and query invalidation.
- [x] 4.3 Add package-assignment hooks for reading and replacing a package's assigned tryouts.
- [x] 4.4 Add admin bank hooks for admin-scoped reads, create, update, delete, and query invalidation.

## 5. Settings Page UI

- [x] 5.1 Refactor `app/admin/settings/page.tsx` to use React Query data instead of Zustand store persistence.
- [x] 5.2 Add package create, edit, delete, loading, success, and error flows.
- [x] 5.3 Add tryout create, edit, delete, loading, success, and error flows.
- [x] 5.4 Add package tryout assignment UI that saves selected tryout ids to the assignment API.
- [x] 5.5 Wire bank account create, edit, and soft-delete UI to admin bank API mutations.
- [x] 5.6 Add deletion confirmations and show conflict errors for package or tryout deletion blocks.

## 6. Verification

- [x] 6.1 Run focused API route tests and fix failures.
- [x] 6.2 Run `npm run test` and fix failures.
- [x] 6.3 Run `npm run lint` and fix failures.
- [x] 6.4 Manually inspect settings flows for package CRUD, tryout CRUD, assignments, and bank CRUD in the admin UI.

## 7. Post-implementation sync fixes

- [x] 7.1 Compute package tryout counts from `PackageTryout` assignments for package reads and admin layout prefetches.
- [x] 7.2 Ensure hard refresh does not hydrate soft-deleted packages by filtering `deletedAt: null` in admin package prefetch.
- [x] 7.3 Add flat all-tryouts read support so unassigned tryouts remain visible in settings after reload.
- [x] 7.4 Remove duplicate bank creation button and wire the bank card header button to the create form.
- [x] 7.5 Show assigned trial tryouts inside paid-package tabs on `app/admin/soal/page.tsx`.
- [x] 7.6 Preserve shared tryout state across packages by editing shared `Tryout.id` data instead of package-local copies.
- [x] 7.7 Add `Trial` indicator to paid-package tryout tabs when the assigned tryout is marked trial.
