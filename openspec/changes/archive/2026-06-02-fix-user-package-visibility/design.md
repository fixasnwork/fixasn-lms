## Context

User pages had split package data sources. Buy and payment pages used Zustand defaults, while tryout/dashboard used API or Prisma. This caused stale package lists, synthetic package IDs in payment flows, and soft-deleted packages appearing after hydration. `Paket Starter` was also hidden by UI filters because package-level `isTrial` was treated as free-trial exclusion.

## Goals / Non-Goals

**Goals:**
- Use DB/API-backed package data for user-visible catalog and payment selection.
- Exclude soft-deleted packages from server-prefetched/hydrated package cache and dashboard package queries.
- Show all active paid packages, including `Paket Starter`.
- Prevent duplicate purchases by clearly marking owned packages with a non-truncated `Dimiliki` indicator and disabling buy action.

**Non-Goals:**
- Redesign package admin management.
- Change payment verification semantics.
- Add new package schema fields or database migrations.
- Change tryout access rules beyond existing pending/verified payment ownership.

## Decisions

- Prefer API/TanStack Query data over Zustand defaults for user package/payment pages.
  - Rationale: API data reflects DB IDs, active state, and soft-delete filtering.
  - Alternative considered: call `fetchPackages()` in Zustand before rendering. Rejected because stale fallback/default IDs can still leak into payment flow.

- Treat ownership as existing pending or verified payment for the package.
  - Rationale: existing tryout access logic already grants access for both statuses.
  - Alternative considered: verified-only ownership. Rejected because it would contradict current access behavior.

- Remove `!isTrial` package filters from user package lists.
  - Rationale: `Paket Starter` is a paid package and must be visible when active. Free trial is represented by tryout-level `isTrial`, not package list visibility.
  - Alternative considered: add new package flag. Rejected as unnecessary for this fix.

- Keep buy page owned cards visible but disabled with a `Dimiliki` marker positioned inside the card bounds.
  - Rationale: user can see ownership state without initiating duplicate payment, and placing the badge inside the card avoids clipping from card overflow behavior.
  - Alternative considered: hide owned packages. Rejected because requirement asks for visible indicator.

## Risks / Trade-offs

- Existing seeded DB may still have `Paket Starter.isTrial = true` → UI now still shows it because user pages no longer exclude trial packages; seed default updated for future resets.
- Active package with no tryouts can appear in tryout package lists → existing package/tryout relation behavior unchanged.
- Pending payments block another purchase attempt → matches current access policy but may require admin cleanup if payment was abandoned.

## Migration Plan

- Deploy code changes normally; no database migration required.
- Future reset/seed uses `Paket Starter.isTrial = false`.
- Rollback by reverting page data-source/filter changes and seed default change.

## Open Questions

- Should abandoned pending payments expire automatically? Out of scope.
- Should package-level `isTrial` be removed or renamed to avoid confusion? Out of scope.
