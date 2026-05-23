## Context

The app is a single-package Next.js App Router application with server-rendered layout shells and client-side admin components. User dashboard pages already use a responsive sidebar plus mobile bottom navigation pattern, while admin pages share a similar shell but still contain desktop-oriented constraints and dense management UI that can overflow on mobile and tablet viewports.

The affected admin surface includes the admin layout, admin sidebar/navigation, dashboard cards, payment verification cards/modals, question table/editor flows, landing/logo editor controls, image upload, and settings forms. The change must preserve existing admin routes, authorization, data fetching, API behavior, and brand styling.

## Goals / Non-Goals

**Goals:**

- Make admin pages usable at mobile, tablet, and desktop widths without clipped content, inaccessible controls, or forced full-page horizontal scrolling.
- Keep navigation consistent with the user dashboard pattern where it fits: fixed desktop sidebar, mobile bottom navigation, safe-area padding, and enough bottom content padding for fixed mobile nav.
- Adapt dense admin content into responsive grids, stacked cards, wrapped action groups, and scrollable local containers where necessary.
- Keep admin interaction flows intact for payment verification, question management, settings edits, logo editing, and uploads.
- Add targeted tests for behavior that can regress without visual inspection, especially component rendering and interaction states.

**Non-Goals:**

- No new admin routes, permissions, database schema, API contracts, authentication behavior, or external dependencies.
- No full visual redesign of the product or replacement of the current Tailwind v4 styling approach.
- No conversion of all admin tables to a third-party data-grid package.
- No implementation of viewport-specific server rendering; responsive behavior should remain CSS/client-layout driven.

## Decisions

1. Reuse the existing dashboard navigation model for admin, with lower-frequency admin destinations behind a mobile "More" menu.

Rationale: the user dashboard already has a proven responsive shell with a fixed desktop sidebar and mobile bottom navigation. Admin should follow that mental model for consistency and lower implementation risk.

Alternative considered: show all admin destinations directly in the mobile bottom navigation. This keeps one-tap access to every section but crowds labels and icons on narrow screens. The selected approach keeps frequent destinations visible and moves lower-frequency destinations behind "More".

2. Fix layout overflow at the admin shell before tuning individual pages.

Rationale: `app/admin/layout.tsx` owns global page padding, sidebar offset, viewport width constraints, and mobile bottom padding. If the shell uses desktop-only max-width calculations on small screens, individual components will still feel broken.

Alternative considered: patch each page independently. This would be slower and less reliable because every page would need to compensate for the same shell-level constraints.

3. Prefer stacked mobile cards for management lists, including a true mobile card list for `SoalTable`.

Rationale: payment verification and dashboard summaries are better as stacked cards on mobile. Question banks may still need table-like density on tablet/desktop, but mobile should expose primary question details and actions without requiring users to pan across six columns.

Alternative considered: keep all tables as `overflow-x-auto`. This avoids rewriting markup but degrades mobile usability because core actions and labels can be offscreen.

4. Make action groups wrap and become full-width on narrow screens.

Rationale: admin workflows rely on short action buttons such as verify, block, edit, delete, save, and upload. On mobile these must remain visible, tappable, and ordered near their related content.

Alternative considered: hide secondary actions behind menus. This saves space but increases interaction cost and can obscure important admin actions.

5. Keep responsive behavior in Tailwind classes and existing components.

Rationale: the project uses Tailwind v4 with theme tokens in CSS and does not need a runtime breakpoint library. Responsive behavior should use Tailwind's standard viewport breakpoints (`sm`, `md`, `lg`, `xl`) and component composition.

Alternative considered: add viewport hooks or resize observers. This adds complexity and hydration risk for a layout problem that CSS handles well.

6. Improve shared primitives only when admin usage requires it.

Rationale: `Button`, `Card`, `Modal`, `Badge`, and `StatCard` are shared. Changes should be compatible with current user pages and should not alter global behavior unless responsive safety requires it, such as modal max width, mobile padding, or button wrapping.

Alternative considered: create admin-only duplicate primitives. This avoids shared regressions but creates design drift and duplicated maintenance.

## Risks / Trade-offs

- Mobile bottom navigation can become crowded because admin has five primary sections. Mitigation: keep high-frequency destinations in the bottom bar and group lower-frequency destinations behind "More".
- Converting wide tables into mobile cards may duplicate some rendering logic. Mitigation: isolate row/card presentation inside the admin component rather than spreading breakpoint-specific markup across pages.
- Shared primitive changes can affect user pages. Mitigation: keep primitive updates additive and verify affected component tests plus a production build.
- Admin pages may contain long user IDs, package names, image URLs, or bank account strings. Mitigation: use `min-w-0`, wrapping, truncation, and local scroll containers around only the content that truly cannot wrap.
- Visual responsiveness is hard to fully prove with unit tests. Mitigation: combine targeted component tests with manual viewport checks for mobile, tablet, and desktop breakpoints.

## Migration Plan

1. Update the admin layout shell to use mobile-first width, padding, and bottom-spacing rules while preserving server auth and React Query hydration.
2. Update `AdminSidebar` mobile behavior to avoid label clipping and keep all admin destinations reachable.
3. Update each admin page/component in small slices: dashboard, payments, settings, landing/logo editor, image upload, and soal/question management.
4. Adjust shared UI primitives only where admin responsiveness depends on them.
5. Add or update targeted tests for changed component behavior.
6. Run `npm run build` and relevant tests before applying the change.

Rollback is a normal code revert because there are no API, database, migration, or dependency changes.

## Resolved Questions

- Admin mobile navigation should move lower-frequency destinations behind a "More" menu.
- Responsive acceptance should use Tailwind standard breakpoints: `sm`, `md`, `lg`, and `xl`.
- `SoalTable` should render as a true card list on mobile instead of relying on horizontal table scrolling.
