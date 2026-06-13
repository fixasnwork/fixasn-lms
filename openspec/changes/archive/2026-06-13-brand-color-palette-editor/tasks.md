## 1. CSS Infrastructure

- [x] 1.1 Add `:root` CSS variables (`--brand-primary`, `--brand-secondary`, `--brand-dark`) with default hex values to `app/globals.css`
- [x] 1.2 Add `@theme inline` block in `app/globals.css` defining `--color-brand`, `--color-brand-secondary`, `--color-brand-dark` referencing the CSS variables
- [x] 1.3 Extend `LogoConfig` interface in `lib/types.ts` with `themePrimary`, `themeSecondary`, `themeDark` string fields
- [x] 1.4 Update `DEFAULT_LOGO_CONFIG` in `hooks/useTryoutQueries.ts` with default theme color values
- [x] 1.5 Update default `logoConfig` in `store/useAppStore.ts` with default theme color values
- [x] 1.6 Add CSS variable injection in `store/useAppStore.ts` `fetchLogoConfig` — set `document.documentElement.style.setProperty()` for each theme color after fetch

## 2. Component Migration — Shared UI

- [x] 2.1 Migrate `components/ui/Button.tsx` — replace `[#1B3A6B]` with `brand`, `[#2563EB]` with `brand-secondary`
- [x] 2.2 Migrate `components/ui/StatCard.tsx` — replace default color prop `#1B3A6B` with theme reference
- [x] 2.3 Migrate `components/ui/Modal.tsx` — replace `[#1B3A6B]` heading color
- [x] 2.4 Migrate `components/layouts/AdminSidebar.tsx` — replace gradient colors `[#0C1E45]`, `[#1B3A6B]`
- [x] 2.5 Migrate `components/layouts/UserSidebar.tsx` — replace gradient colors `[#1B3A6B]`, `[#2563EB]`

## 3. Component Migration — Landing Page

- [x] 3.1 Migrate `components/landing/LandingPage.tsx` — hero gradient, heading colors, SKD card colors
- [x] 3.2 Migrate `components/landing/PackagesSection.tsx` — heading, price, border colors
- [x] 3.3 Migrate `components/landing/TestimonialsSection.tsx` — heading, avatar gradient
- [x] 3.4 Migrate `components/landing/CTASection.tsx` — gradient background, footer background

## 4. Component Migration — Feature Components

- [x] 4.1 Migrate `components/tryout/TryoutEngine.tsx` — progress bar, question nav, card gradients
- [x] 4.2 Migrate `components/tryout/TryoutReviewMode.tsx` — heading, nav ring, backgrounds
- [x] 4.3 Migrate `components/tryout/PembahasanNavigator.tsx` — nav ring, backgrounds
- [x] 4.4 Migrate `components/dashboard/DashboardHomeClient.tsx` — headings, StatCard colors, chart colors
- [x] 4.5 Migrate `components/ranking/RankingClient.tsx` — headings, gradient cards, rank display
- [x] 4.6 Migrate `components/admin/AdminDashboardClient.tsx` — headings, StatCard colors
- [x] 4.7 Migrate `components/admin/LogoEditor.tsx` — section heading, preview gradient

## 5. Component Migration — Pages

- [x] 5.1 Migrate `app/login/page.tsx` — heading, loading dot
- [x] 5.2 Migrate `app/(user)/dashboard/page.tsx` — (if hardcoded refs exist)
- [x] 5.3 Migrate `app/(user)/tryout/page.tsx` — headings, active states, badges
- [x] 5.4 Migrate `app/(user)/tryout/[attemptId]/page.tsx` — heading
- [x] 5.5 Migrate `app/(user)/buy/page.tsx` — headings, package card gradients
- [x] 5.6 Migrate `app/(user)/payment/page.tsx` — headings, bank card gradients
- [x] 5.7 Migrate `app/(user)/profile/page.tsx` — heading, avatar gradient
- [x] 5.8 Migrate `app/(user)/video/page.tsx` — heading, video placeholder bg
- [x] 5.9 Migrate `app/(user)/ranking/page.tsx` — (if hardcoded refs exist)
- [x] 5.10 Migrate `app/admin/settings/page.tsx` — headings, tryout/package card text
- [x] 5.11 Migrate `app/admin/soal/page.tsx` — headings, question list text
- [x] 5.12 Migrate `app/admin/payments/page.tsx` — heading, StatCard, gradient
- [x] 5.13 Migrate `app/admin/landing/page.tsx` — headings

## 6. Component Migration — Error/Loading Pages

- [x] 6.1 Migrate `app/not-found.tsx` — heading, button
- [x] 6.2 Migrate `app/err.tsx` — heading, button
- [x] 6.3 Migrate `app/unauthorized.tsx` — heading, button
- [x] 6.4 Migrate `app/forbidden.tsx` — heading, button
- [x] 6.5 Migrate `app/global-error.tsx` — heading, button
- [x] 6.6 Migrate `app/loading.tsx` — loading dot
- [x] 6.7 Migrate `app/admin/loading.tsx` — loading dot
- [x] 6.8 Migrate `app/admin/layout.tsx` — sidebar fallback gradient
- [x] 6.9 Migrate `app/(user)/loading.tsx` — loading dot
- [x] 6.10 Migrate `app/(user)/tryout/loading.tsx` — loading dot
- [x] 6.11 Migrate `app/(user)/tryout/[attemptId]/loading.tsx` — loading dot
- [x] 6.12 Migrate `app/(user)/tryout/[attemptId]/err.tsx` — heading, button
- [x] 6.13 Migrate `app/(user)/tryout/err.tsx` — heading, button

## 7. Verification — Migration Complete

- [x] 7.1 Run `grep -r '\[#1B3A6B\]\|\[#2563EB\]\|\[#0C1E45\]' components/ app/` — confirm zero matches
- [x] 7.2 Run `npm run build` — confirm no build errors
- [x] 7.3 Visual check: landing page, dashboard, tryout page, admin settings — confirm colors match pre-migration

## 8. Admin Color Picker UI

- [x] 8.1 Add "Brand Colors" `Card` section (`BrandColorsCard` component) to `app/admin/settings/page.tsx` below existing sections
- [x] 8.2 Implement 3 color picker rows: `<input type="color">` + hex text input, labeled "Warna Primer", "Warna Sekunder", "Warna Gelap"
- [x] 8.3 Wire color pickers to `userPrimary`/`userSecondary`/`userDark` nullable state with null-coalescing fallback to `logoConfig` data (no `useEffect`)
- [x] 8.4 Add "💾 Simpan" button with loading indicator (`⏳ Menyimpan…` + disabled while saving)
- [x] 8.5 Add 4 preset buttons ("FIX ASN Default", "Hijau", "Ungu", "Merah") that set all 3 colors at once
- [x] 8.6 Add live preview swatches: gradient hero, sidebar bar, CTA button + outline button
- [x] 8.7 Toast notification (sonner) for success/error instead of `alert()`
- [x] 8.8 TanStack Query cache invalidation after save so form fields refresh from DB
- [x] 8.9 Responsive grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` with `w-10 h-10` color inputs, `flex-shrink-0`, `min-w-0`

## 9. Server Integration

- [x] 9.1 Add `requireAdmin()` auth guard to `PUT /api/logo-config` (GET stays public)
- [x] 9.2 Server-side CSS variable injection: prefetch `logo-config` in `app/admin/layout.tsx`, inject `<style>` tag overriding `:root` variables
- [x] 9.3 Call `fetchLogoConfig()` on `SettingsPage` mount for client-side CSS var injection on hard refresh

## 10. Polish & Responsiveness

- [x] 10.1 Install `sonner` and add `<Toaster position="bottom-right" richColors />` to `app/layout.tsx`
- [x] 10.2 Migrate `alert()` → `toast.success()`/`toast.error()` in `LogoEditor.tsx` save handler
- [x] 10.3 Migrate `alert()` → `toast.success()`/`toast.error()` in `app/admin/landing/page.tsx` modal save handler
- [x] 10.4 Fix `LogoEditor.tsx` color picker grid: merge two grids → single `md:grid-cols-3` grid, `w-10 h-10` inputs, `min-w-0`
- [x] 10.5 Fix `Custom Image` checkbox: inline label + `items-end` alignment in grid

## 11. Final Verification

- [x] 11.1 Run `npm run build` — no build errors
- [x] 11.2 Run `npm run lint` — no lint errors
- [x] 11.3 Manual test: change brand colors in admin → verify landing page, dashboard, sidebar reflect new colors
- [x] 11.4 Manual test: hard refresh admin page → verify colors persist from DB (server-side injection)
- [x] 11.5 Manual test: verify form fields update after save → colors match what was saved
- [x] 11.6 Manual test: verify responsive layout on iPad Mini/Air/Pro breakpoints
