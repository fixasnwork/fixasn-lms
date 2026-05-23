## 1. Admin Shell And Navigation

- [x] 1.1 Update `app/admin/layout.tsx` to use mobile-first width, padding, and bottom spacing without applying desktop sidebar max-width rules below `md`.
- [x] 1.2 Preserve desktop sidebar spacing in `app/admin/layout.tsx` at `md`, `lg`, and `xl` breakpoints without causing viewport overflow.
- [x] 1.3 Refactor `components/layouts/AdminSidebar.tsx` mobile navigation to show high-frequency destinations directly and place lower-frequency destinations behind a "More" menu.
- [x] 1.4 Ensure the admin mobile "More" menu closes after a destination is selected and keeps logout reachable.
- [x] 1.5 Verify all existing admin route paths and authorization behavior remain unchanged.

## 2. Responsive Admin Pages

- [x] 2.1 Update `components/admin/AdminDashboardClient.tsx` so dashboard headings, statistic cards, and recent payment rows adapt cleanly across `sm`, `md`, `lg`, and `xl`.
- [x] 2.2 Update `app/admin/payments/page.tsx` so payment stats, filters, payment cards, action groups, proof modal, and block modal remain readable and tappable on mobile and tablet.
- [x] 2.3 Update `app/admin/settings/page.tsx` so package and bank-account forms stack on narrow screens and wrap save/add/remove actions without clipping.
- [x] 2.4 Update `app/admin/landing/page.tsx` and `components/admin/LogoEditor.tsx` so branding fields, color controls, previews, and preset controls stack responsively.
- [x] 2.5 Update `components/admin/ImageUpload.tsx` so upload controls, preview, and error/status states fit narrow viewports.

## 3. Question Management

- [x] 3.1 Refactor `components/admin/SoalTable.tsx` to render a true question card list below `md`.
- [x] 3.2 Preserve the existing table layout in `components/admin/SoalTable.tsx` at `md` and wider breakpoints.
- [x] 3.3 Ensure mobile question cards include category, question preview, option summary, answer summary, images when present, and edit/delete actions.
- [x] 3.4 Ensure mobile question edit/delete actions are directly visible without horizontal scrolling.
- [x] 3.5 Review `app/admin/soal/page.tsx` for responsive editor/form layout issues introduced by or adjacent to `SoalTable` changes.

## 4. Shared Responsive Primitives

- [x] 4.1 Review `components/ui/Button.tsx` for mobile action-group usage and add responsive-friendly class support only if needed.
- [x] 4.2 Review `components/ui/Card.tsx` and `components/ui/StatCard.tsx` for narrow-card content wrapping and truncation issues.
- [x] 4.3 Review `components/ui/Modal.tsx` so admin modals fit mobile viewports with internal scrolling for overflow content.
- [x] 4.4 Keep shared primitive changes backward-compatible with existing user dashboard and landing page usage.

## 5. Tests And Verification

- [x] 5.1 Add or update component tests for `AdminSidebar` mobile "More" menu rendering and close-on-navigation behavior.
- [x] 5.2 Add or update component tests for `SoalTable` to cover mobile card content and desktop table content.
- [x] 5.3 Add or update tests for any shared UI primitive behavior changed for responsive admin usage.
- [x] 5.4 Run targeted tests for changed components.
- [x] 5.5 Run `npm run build`.
- [x] 5.6 Manually inspect admin pages at Tailwind standard breakpoint classes or equivalent viewport widths for `sm`, `md`, `lg`, and `xl`.
