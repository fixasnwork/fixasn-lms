## Why

Admin pages and components need to work reliably across mobile, tablet, and desktop viewports, matching the responsive quality already expected in user-facing pages. This prevents admin workflows such as dashboard review, payment management, settings, landing configuration, and question management from becoming cramped, clipped, or hard to operate on smaller devices.

## What Changes

- Make admin page layouts responsive across mobile, tablet, and desktop breakpoints.
- Update admin navigation, content spacing, cards, forms, tables, dialogs, and upload/editor components so controls remain readable and usable on narrow screens.
- Preserve current admin functionality, routes, data fetching, authorization, and visual brand direction while adapting layout behavior per viewport.
- Align shared admin UI primitives with responsive usage where admin pages depend on them.
- Add or update tests where responsive behavior affects component rendering or interaction expectations.

## Capabilities

### New Capabilities

- `admin-responsive-layout`: Defines responsive layout and usability requirements for admin pages and admin-specific components across mobile, tablet, and desktop devices.

### Modified Capabilities

- None. There are no existing OpenSpec capabilities in `openspec/specs/` to modify.

## Impact

- Affected admin routes: `app/admin/`, `app/admin/soal/`, `app/admin/landing/`, `app/admin/payments/`, and `app/admin/settings/`.
- Affected layout components: `components/layouts/AdminSidebar.tsx` and admin layout shell behavior in `app/admin/layout.tsx`.
- Affected admin components: `components/admin/AdminDashboardClient.tsx`, `components/admin/SoalTable.tsx`, `components/admin/LogoEditor.tsx`, and `components/admin/ImageUpload.tsx`.
- Potentially affected shared UI primitives used by admin pages: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Modal.tsx`, `components/ui/Badge.tsx`, and `components/ui/StatCard.tsx`.
- No API, database, authentication, authorization, or dependency changes are expected.
