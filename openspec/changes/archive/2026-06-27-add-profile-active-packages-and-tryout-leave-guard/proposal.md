## Why

Two related UX gaps in the user-facing flow:

1. The profile page (`/profile`) only shows account info (name, email, avatar). Users have no at-a-glance view of which tryout packages they currently own and how far they are into each one — they have to go to `/tryout` to figure that out. The page is a natural landing spot for a "Paket Aktif" summary.

2. The tryout runner (`/tryout/[attemptId]`) autosaves answers every 60s, but nothing protects an in-progress attempt from being lost when the user closes the tab, refreshes, or accidentally clicks a sidebar link. The only safety net is the in-engine "Simpan & Keluar" button, which most users don't discover.

## What Changes

- **Add a "Paket Aktif" section to `/profile`.** Renders a card per active package (date-available, payment `pending` or `verified`) with name, description, tryout count, progress (answered/total), best-score average, remaining days, validity window, and a primary CTA to the tryout list. Empty state and loading state included. Matches existing design language (Montserrat, brand palette, `rounded-2xl shadow-md border border-gray-100`).
- **Add a browser-close guard on `/tryout/[attemptId]`.** Registers a `beforeunload` listener while an attempt is in-progress so the native "Changes you made may not be saved" prompt appears on tab close, refresh, or browser exit. The listener is removed on unmount and on completion.
- **Add a sidebar nav-guard modal on `/tryout/[attemptId]`.** When an in-progress tryout is mounted, sidebar/bottom-nav clicks (Dashboard, Tryout SKD, Beli Paket, Video, Ranking, Profil) are intercepted and a confirmation modal appears with **Batal** and **Simpan & Keluar** buttons. "Simpan & Keluar" flushes answers + remaining time + flags to the server via the same `useUpdateAttemptAnswers` + `useUpdateAttemptFlags` mutations the in-engine button uses, then routes to the requested page. Save failure keeps the modal open and surfaces the error inline. The Logout button is intentionally NOT guarded (explicit destructive action).
- **Add a small Zustand store** (`useNavGuardStore`) to coordinate the guard state between the tryout engine and the sidebar without prop-drilling.

## Capabilities

### New Capabilities
- `profile-active-packages`: New section on the profile page showing the user's currently active tryout packages as cards with progress + scores + validity.
- `tryout-leave-guard`: Two-layer guard (browser `beforeunload` + in-app sidebar modal) that prevents accidental loss of in-progress tryout answers.

### Modified Capabilities
<!-- No existing spec REQUIREMENTS are changing. The tryout-save-and-resume spec
     already covers flush-on-exit (the engine's own "Simpan & Keluar" button);
     this change adds an *additional* entry point (sidebar/bottom-nav) plus the
     browser-close path, both of which reuse the same underlying mutations. -->
- (none)

## Impact

**Code:**
- `app/(user)/profile/page.tsx` — add new section + hooks (`usePackages`, `useTryouts`, `useUserPayments`, `useAttemptHistory`) + `isPackageAvailable` filter + per-package stat computation.
- `app/globals.css` — add `@keyframes pa-rise`, `pa-fill`, `pa-pulse` for the new section's motion (entrance, progress fill, status-dot pulse). All animations gated by `motion-safe:` so reduced-motion users get static rendering.
- `store/useNavGuardStore.ts` — **new** Zustand store (`isActive`, `save`, `progress`).
- `components/tryout/TryoutEngine.tsx` — extract `performSaveRef` (latest-closure ref) so both the existing in-engine "Simpan & Keluar" modal and the new sidebar modal share one PUT path; register/unregister the nav guard on `phase === "running"`.
- `components/layouts/UserSidebar.tsx` — subscribe to guard, intercept nav clicks, render confirm modal.
- `app/(user)/tryout/[attemptId]/page.tsx` — add `useEffect` registering `beforeunload` listener for in-progress attempts.

**APIs:** None. Reuses existing `useUpdateAttemptAnswers` + `useUpdateAttemptFlags` mutations.

**Dependencies:** None. `zustand` already in package.

**Tests:** Existing `components/tryout/TryoutEngine.test.tsx` (6 tests) preserved — refactor only changes the save code path's location, not its semantics (all `data-testid` values kept). No new tests added in this change; behaviour is UI-only and observable by manual run.
