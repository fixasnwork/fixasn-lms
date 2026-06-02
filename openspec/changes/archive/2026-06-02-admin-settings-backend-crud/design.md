## Context

`app/admin/settings/page.tsx` currently edits package and bank-account drafts from `useAppStore`. The page updates client state only and does not follow the React Query mutation pattern already used by `app/admin/soal/page.tsx` and `app/admin/payments/page.tsx`.

The database already has the required core models: `Package`, `Tryout`, `PackageTryout`, and `BankAccount`. Packages and tryouts both have `deletedAt` audit fields. Banks also have `deletedAt`. Package purchase/payment history references `Package`, and tryout attempts reference `Tryout`, so destructive deletes can corrupt history.

## Goals / Non-Goals

**Goals:**

- Make admin settings database-backed for packages, tryouts, package assignments, and bank accounts.
- Provide full package CRUD with deletion blocked when payment or purchase history exists.
- Provide full tryout CRUD with deletion blocked when attempt history exists.
- Provide package-to-tryout assignment management through the existing `PackageTryout` junction table.
- Wire bank-account management to backend API calls and soft-delete bank accounts.
- Move settings page data loading and mutations to React Query.
- Keep admin server prefetches aligned with client APIs so hydrated package cache excludes soft-deleted packages and uses current assignment counts.
- Keep question-bank package tabs based on package assignments, including trial tryouts assigned to paid packages.

**Non-Goals:**

- No new DB tables or runtime dependencies.
- No changes to question CRUD beyond preserving existing tryout-question routes.
- No package-specific tryout ordering beyond existing `Tryout.sortOrder`.
- No change to payment verification or purchase entitlement behavior.

## Decisions

### Use entity-specific API routes instead of bulk replacement

Package writes SHALL use `POST /api/packages`, `PUT /api/packages/[packageId]`, and `DELETE /api/packages/[packageId]` instead of the current delete-all/recreate-all `PUT /api/packages` behavior.

Rationale: package rows are referenced by payments and purchases. Bulk replacement can break relations, lose audit fields, and unintentionally cascade junction rows. Single-row mutations preserve row identity and make validation/error handling explicit.

Alternative considered: keep bulk PUT and patch client to call `syncPackages()`. Rejected because it preserves the unsafe destructive write pattern.

### Soft-delete catalog rows when deletion is safe

Package and tryout delete endpoints SHALL check for historical links first. Package deletion is rejected if `Payment` or `UserPurchase` records exist. Tryout deletion is rejected if `TryoutAttempt` records exist. When safe, delete endpoints mark `deletedAt` and remove junction links as needed.

Rationale: audit columns already exist, and hiding rows avoids accidental data loss. Blocking historical deletes preserves reporting and user history.

Alternative considered: hard-delete when no links exist. Rejected because soft-delete is safer and consistent with schema intent.

### Manage package assignments through one replace endpoint

`PUT /api/packages/[packageId]/tryouts` SHALL accept a list of tryout IDs and replace package assignments in one transaction. The endpoint validates package existence and every tryout ID before changing junction rows.

Rationale: settings UI naturally edits assignment as a set of checkboxes. Atomic replacement avoids partial assignment drift.

Alternative considered: individual attach/detach endpoints. Rejected for initial implementation because it adds extra client state complexity without improving admin UX.

### Keep tryout ordering global

The assignment UI SHALL display assigned tryouts ordered by `Tryout.sortOrder`. `PackageTryout` will not gain a package-specific sort field in this change.

Rationale: existing schema and tryout APIs already use `Tryout.sortOrder`. Adding per-package ordering would require schema changes and broader UI design.

Alternative considered: add `PackageTryout.sortOrder`. Deferred as future enhancement.

### Separate user-visible bank reads from admin bank management

Default bank-account reads SHALL return active, non-deleted accounts for user payment flows. Admin settings SHALL fetch non-deleted accounts including inactive accounts through an admin-oriented query path or hook.

Rationale: payment page currently renders all banks returned by `/api/banks`. Soft-deleted or inactive accounts must not appear to users, while admins still need to manage inactive records.

Alternative considered: return all non-deleted banks everywhere and rely on clients to filter. Rejected because user payment UI does not currently filter banks.

### Use React Query in settings

Settings page SHALL use package, tryout, package-assignment, and bank queries/mutations with query invalidation after successful mutations. Admin layout server prefetches for the same query keys SHALL apply the same non-deleted filters and derived fields as client API reads.

Rationale: this matches existing admin pages, avoids duplicating server state in Zustand, and keeps user/dashboard data fresh after admin edits. Aligning server prefetch prevents a hard refresh from hydrating stale or soft-deleted package rows back into the UI.

Alternative considered: keep Zustand and call store sync actions. Rejected because it leaves settings inconsistent with the rest of admin and mixes local/server state.

### Treat tryouts as shared entities across package assignments

Question-bank admin tabs SHALL display the tryouts assigned to the selected package, including trial tryouts when they are assigned to paid packages. Mutations to questions or duration SHALL target the shared `Tryout.id`, so the same tryout appears with the same state in every package that includes it.

Rationale: `PackageTryout` represents many-to-many package membership, not package-local clones. Filtering trial tryouts out of paid packages hides valid assignments and creates confusing count drift.

Alternative considered: keep a separate trial-only area and hide trial tryouts from paid packages. Rejected because admins need to manage actual package composition and shared tryouts consistently.

## Risks / Trade-offs

- Existing clients may expect `/api/banks` to return inactive banks → Default endpoint must prioritize user payment safety; admin hook can request admin view.
- Existing tests for `PUT /api/packages` may fail → Replace or update tests to assert single-row CRUD and deletion blocking.
- Soft-deleted rows with unique names/account numbers can block recreation → Create/update handlers should return clear 409 conflict messages; restoration is out of scope.
- Assignment replacement can remove a tryout from a package accidentally → UI should show clear selected state and mutation error/success feedback.
- Server-prefetched React Query data can bypass API filters → prefetch queries must use the same `deletedAt` and count semantics as API routes.
- Unassigned tryouts can be hidden by grouped package responses → settings needs a flat all-tryouts read for catalog management.
- Tryout deletion with existing package links but no attempts could surprise users → Endpoint should unlink package assignments in the same transaction and UI should confirm deletion.

## Migration Plan

1. Add/adjust API handlers while keeping `GET /api/packages`, `GET /api/tryouts`, and user-visible `GET /api/banks` behavior safe for existing clients.
2. Update React Query hooks for package, tryout, assignment, and bank mutations.
3. Rewrite settings page to use React Query and call backend mutations.
4. Align admin layout package prefetch and question-bank package tabs with backend assignment semantics.
5. Add/update route tests for CRUD, deletion blocking, soft delete filtering, flat tryout reads, and assignment replacement.
6. Run `npm run test` and `npm run lint`.

Rollback: revert settings page and API route changes; existing database schema remains compatible because no schema migration is required.
