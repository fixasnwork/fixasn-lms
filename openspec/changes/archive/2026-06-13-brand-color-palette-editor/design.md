## Context

FIX ASN uses Next.js 16 + Tailwind CSS v4 + Prisma/Postgres. The app has 150+ hardcoded hex color references across 42 files. The existing `LogoConfig` key-value store (via `LogoConfigEntry` Prisma model) already manages logo-related colors (`warnaNama`, `warnaTag`, `warnaKiri`, `warnaKanan`, `warnaInner`) but these only affect the Logo component. The app had no CSS variables, no `@theme` block in `globals.css`, and no runtime theming infrastructure.

Current color usage:
- `#1B3A6B` (navy) — ~60 refs: headings, sidebar, text accents
- `#2563EB` (blue) — ~40 refs: buttons, active states, badges
- `#0C1E45` (dark navy) — ~15 refs: hero bg, sidebar gradient
- `#F5C518` (gold) — ~10 refs: accent, CTA highlights
- `#F1F5F9` (light gray) — ~10 refs: card backgrounds, inactive states
- `#DBEAFE` (light blue) — ~5 refs: selected states

## Goals / Non-Goals

**Goals:**
- 3 CSS custom properties for brand colors: `--brand-primary`, `--brand-secondary`, `--brand-dark`
- Tailwind v4 `@theme` integration so `text-brand`, `bg-brand-secondary`, etc. work
- Replace ALL 150+ hardcoded color references with theme-aware classes
- Admin color picker UI in settings page with live preview swatches, presets, and persistence to existing `logo-config` API
- Runtime CSS variable injection from DB config via `useAppStore` (client-side) and server-side via `<style>` tag in admin layout
- Auth guard on `PUT /api/logo-config` (admin-only writes)
- TanStack Query cache invalidation after save so form fields update from DB
- Toast notifications via `sonner` instead of `alert()`
- Responsive color picker layout covering iPad Mini/Air/Pro breakpoints
- Loading indicator on save buttons

**Non-Goals:**
- User-facing theme customization (admin only)
- Dark mode support
- More than 3 color variables (minimal palette)
- Modifying the existing Logo component color pickers (those stay as-is)
- New Prisma model or API route (reuse `LogoConfigEntry`)

## Decisions

### Decision 1: 3 CSS variables, not more

**Choice**: `--brand-primary`, `--brand-secondary`, `--brand-dark`

**Rationale**: The codebase uses ~6 distinct color families but most map to 3 semantic roles:
- Primary (`#1B3A6B` → `--brand-primary`): headings, text, sidebar accent
- Secondary (`#2563EB` → `--brand-secondary`): buttons, interactive elements, badges
- Dark (`#0C1E45` → `--brand-dark`): dark backgrounds, hero, footer

Gold (`#F5C518`) and neutral (`#F1F5F9`) are used less frequently and don't change with branding. Keeping them hardcoded avoids scope creep.

### Decision 2: Tailwind v4 `@theme` block

**Choice**: Define theme tokens in `globals.css` using Tailwind v4's `@theme inline` directive.

**Rationale**: Tailwind v4 supports `@theme` natively. This lets us write `text-brand` instead of `text-[var(--brand-primary)]`. Cleaner classes, better DX.

```css
:root {
  --brand-primary: #1B3A6B;
  --brand-secondary: #2563EB;
  --brand-dark: #0C1E45;
}
@theme inline {
  --color-brand: var(--brand-primary, #1B3A6B);
  --color-brand-secondary: var(--brand-secondary, #2563EB);
  --color-brand-dark: var(--brand-dark, #0C1E45);
}
```

Fallback hex values in `var()` ensure visual parity even if CSS vars aren't set.

### Decision 3: Extend LogoConfig, don't create new API

**Choice**: Add 3 new keys (`themePrimary`, `themeSecondary`, `themeDark`) to existing `logo-config` API.

**Rationale**:
- `LogoConfigEntry` is a flexible key-value store — adding keys needs no schema migration
- Existing `fetchLogoConfig`/`syncLogoConfig` in `useAppStore` already handles load/save
- Avoids duplicating API route, DB model, and fetch logic

### Decision 4: Dual-layer CSS variable injection (server + client)

**Choice**: 
1. **Server-side**: Admin layout (`app/admin/layout.tsx`) prefetches `logo-config` from Prisma and injects an inline `<style>` tag overriding `:root` CSS variables. This ensures brand colors apply immediately on hard refresh — no flash of default colors.
2. **Client-side**: `useAppStore.fetchLogoConfig` sets `document.documentElement.style.setProperty()` after fetching config. This covers dynamic updates after admin saves new colors.

**Rationale**:
- Server injection eliminates the flash-of-default-colors problem on hard refresh
- Client injection handles in-app dynamic updates (save → immediate visual feedback)
- The admin layout was already a server component with Prisma prefetch — adding logo-config was trivial
- Rejected the initial client-only approach (Decision 4 in original design) because it caused hard-refresh problems: the setting page never called `fetchLogoConfig` on mount

**Alternative considered**: Client-only injection with `fetchLogoConfig` called in `SettingsPage` mount. Rejected because it doesn't cover hard refreshes on other admin pages (soal, payments, dashboard) and the `LandingPage` already had this logic.

### Decision 5: Admin-only auth guard on PUT

**Choice**: Add `requireAdmin()` guard to `PUT /api/logo-config`. GET remains public (landing page reads brand colors).

**Rationale**:
- Before this change, anyone could PUT to logo-config with no auth
- Brand colors are admin-only configuration — should be gated behind admin auth
- GET stays public because the public landing page uses `useLogoConfig()` to read brand colors

### Decision 6: `userPrimary`/`userSecondary`/`userDark` state pattern (no useEffect)

**Choice**: Store user edits in nullable state (`userPrimary`, `userSecondary`, `userDark`). Derive display value as `userPrimary ?? logoConfig?.themePrimary ?? default`. Clear to `null` after save. No `useEffect`.

**Rationale**:
- Initial attempt used `useEffect` to sync DB values into local state. ESLint `react-hooks/set-state-in-effect` flagged this as bad practice (cascading renders)
- The null-coalescing pattern (`??`) is cleaner: DB config is source of truth, user edits are temporary overrides
- After save + cache invalidation, clearing overrides triggers re-render from fresh `logoConfig` data

### Decision 7: TanStack Query cache invalidation after save

**Choice**: After `syncLogoConfig()` succeeds, call `queryClient.invalidateQueries({ queryKey: ['logo-config'] })`.

**Rationale**:
- `useLogoConfig()` has `staleTime: 10 * 60_000` — after save, the hook returns stale data
- Without invalidation, `logoConfig` from the hook stays at old values, so `userPrimary === null` falls back to pre-save DB values → form fields appear unchanged
- Invalidation forces a refetch from the API (which just reads fresh Prisma data), updating the hook's `data`, which flows into the derived display values

### Decision 8: Toast notifications via sonner

**Choice**: Install `sonner`, add `<Toaster position="bottom-right" richColors />` to root layout, replace all `alert()` calls with `toast.success()`/`toast.error()`.

**Rationale**:
- `alert()` blocks the UI and looks unpolished
- `sonner` provides animated, non-blocking toast notifications with built-in rich color support
- Minimal bundle size (~3KB gzipped)
- Used in both `BrandColorsCard` (settings) and `LogoEditor` (landing page) save handlers

### Decision 9: Responsive grid breakpoints

**Choice**: Color picker grid uses `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`. Color input is `w-10 h-10` with `flex-shrink-0` and visible border. Hex input has `min-w-0`.

**Rationale**:
- Original `lg:grid-cols-3` (1024px) left iPad Mini (768px) and iPad Air (820px) at 2 columns with overlap
- `md:grid-cols-3` (768px) covers all iPad breakpoints
- `w-8 h-8` color inputs shrank to near-invisible lines on iPad Mini vertical — bumped to `w-10 h-10` with `border` for visibility
- `flex-shrink-0` prevents color swatch from collapsing; `min-w-0` prevents hex input from overflowing flex container

## Risks / Trade-offs

**[Risk] Visual regression during migration** → Each file replacement must preserve the exact same color. Use search-and-replace with verification. Fallback hex in `@theme` ensures default behavior is unchanged. ✅ Verified: zero `[#1B3A6B]`, `[#2563EB]`, `[#0C1E45]` remain in Tailwind classes.

**[Risk] `@theme` variable name conflicts** → Prefix with `brand-` to avoid collision with Tailwind's built-in palette. Tailwind v4 `@theme` merges with defaults, doesn't override. ✅ No conflicts found.

**[Risk] Tailwind v4 `@theme` behavior uncertainty** → The `@theme inline` block in Tailwind v4 defines theme values that become utility classes. `text-brand` resolves to `var(--brand-primary, #1B3A6B)`. ✅ Verified working across all components.

**[Trade-off] Only 3 variables** → Some components use gold (`#F5C518`) or light gray (`#F1F5F9`) which won't be theme-able. Acceptable for minimal scope. Can add more variables later.

**[Trade-off] Client-side injection** → Brief moment on page load where CSS vars aren't set (uses fallback hex). Acceptable since fallback = current color = no visible difference. Server injection in admin layout eliminates this entirely for admin pages.

## Migration Plan

1. **Phase 1 — CSS Infrastructure** ✅
   - Add `:root` CSS variables to `globals.css`
   - Add `@theme inline` block for Tailwind integration
   - Extend `LogoConfig` type with theme fields
   - Update `DEFAULT_LOGO_CONFIG` with theme defaults
   - Add client-side CSS variable injection in `useAppStore.fetchLogoConfig`

2. **Phase 2 — Component Migration** (42 files) ✅
   - Replace `text-[#1B3A6B]` → `text-brand`
   - Replace `from-[#1B3A6B]` → `from-brand`
   - Replace `text-[#2563EB]` → `text-brand-secondary`
   - Replace `bg-[#2563EB]` → `bg-brand-secondary`
   - Replace `from-[#0C1E45]` → `from-brand-dark`
   - Replace `bg-[#0C1E45]` → `bg-brand-dark`
   - Verify each file renders identically

3. **Phase 3 — Admin UI** ✅
   - Add "Brand Colors" Card to `admin/settings/page.tsx`
   - 3 color pickers with hex input, responsive grid
   - 4 preset color schemes (Default, Hijau, Ungu, Merah)
   - Live preview swatches (gradient hero, sidebar bar, CTA button, outline button)
   - Save via existing `syncLogoConfig` with TanStack Query cache invalidation
   - Toast notifications for success/error
   - Loading indicator on save button

4. **Phase 4 — Server Integration & Polish** ✅
   - Server-side CSS var injection in admin layout
   - Auth guard on PUT /api/logo-config
   - Migrate all `alert()` to `sonner` toast in LogoEditor and BrandColorsCard
   - Responsive color picker fixes for tablet breakpoints

5. **Rollback**: If issues arise, revert CSS variable references to hardcoded hex. No DB migration to roll back.
