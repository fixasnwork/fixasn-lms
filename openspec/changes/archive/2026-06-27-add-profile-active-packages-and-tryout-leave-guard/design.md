## Context

The user-facing surface has two thin spots around in-progress tryout sessions:

1. `/profile` is a pure account-management page (avatar, name, email, logout). Users wanting to see "what packages do I currently have access to, and how far am I into each one?" have to navigate to `/tryout` and mentally filter the catalog. The profile is the natural anchor for a personalised summary.

2. The tryout runner autosaves every 60s and has an in-engine "Simpan & Keluar" button, but the engine's only "leave" affordance is the back button on the *ready* and *result* screens — once the user is in the running phase, the only way out is the small header button (easy to miss) or the navigation chrome surrounding the page (no protection). Closing the tab, refreshing, or clicking any sidebar link drops the in-progress attempt without any warning.

Constraints:
- Project uses Next.js 16 App Router + React 19.2 with the new React Compiler + `react-hooks/purity` ESLint rule.
- Single font (Montserrat) and brand palette (`#1B3A6B / #2563EB / #0C1E45`) — any new UI must follow the existing vocabulary (`rounded-2xl shadow-md border border-gray-100` cards, `text-xs font-bold text-gray-500` labels, `bg-green-500` / `bg-amber-500` for status accents).
- TanStack Query is the source of truth for live data on the user side; mutations already expose `useUpdateAttemptAnswers` and `useUpdateAttemptFlags`.
- Zustand is already used for cross-component state (`useAuthStore`, `useAppStore`).

## Goals / Non-Goals

**Goals:**
- Show users their active packages + per-package progress on `/profile`, with motion that fits the existing aesthetic and respects `prefers-reduced-motion`.
- Add a `beforeunload` browser-close guard on `/tryout/[attemptId]` so tab close / refresh / browser exit shows the native "unsaved changes" prompt while an attempt is in-progress.
- Add an in-app confirmation modal triggered by sidebar/bottom-nav clicks while a tryout is in-progress. Confirming flushes the same answers+time+flags payload the engine uses and then navigates. Cancelling keeps the user on the tryout page.
- Reuse the existing save mutations — no new server endpoints.

**Non-Goals:**
- No "force leave without saving" escape hatch. Per spec, modal is two-button only.
- No guard on the Logout button (explicit destructive action; out of scope).
- No guard on the browser back/forward buttons (would require a separate `popstate` handler + fullscreen custom modal — heavier UX change, deferred).
- No "ready" or "result" phase guarding — only the running phase, where the timer is ticking and answers are dirty.
- No new dedicated tests in this change; existing `TryoutEngine.test.tsx` (6 cases) preserved by the refactor.

## Decisions

### 1. Profile section: inline, not a new component
**Decision:** Put the section directly in `app/(user)/profile/page.tsx` as JSX, not in a separate `components/profile/ActivePackages.tsx`.
**Why:** The page is already a client component, the data is already in scope via TanStack Query hooks, and a single card list with one shape is too small to justify the file split. The hook-derived data (`activePackages`, `bestScoresByTryout`, `finishedTryoutIdsByPkg`) is page-local.
**Alternatives:** Extract to a component — rejected; adds an indirection for ~80 lines of JSX that's only used here.

### 2. Nav guard: tiny Zustand store, not React Context
**Decision:** Use a new `store/useNavGuardStore.ts` Zustand store with `{ isActive, save, progress }`.
**Why:** The state is global-by-tab (one active tryout per tab), and the sidebar is a sibling of the tryout page, not a parent. Context would force either lifting the sidebar into a provider near the page, or wrapping the entire user layout. Zustand is already the established pattern in the repo (`useAuthStore`, `useAppStore`).
**Alternatives:**
- React Context: rejected; the user layout doesn't currently provide a guard context, and adding one means modifying `app/(user)/layout.tsx`.
- Module-level `let` ref: rejected; breaks if multiple tabs ever share state, and is hard to test.

### 3. Save function: ref-based "latest closure" pattern
**Decision:** The store holds a stable `save: () => performSaveRef.current()` wrapper. The engine keeps a `useRef<() => Promise<void>>` that is reassigned on every render with a fresh closure capturing the current `answers` / `timeLeft` / `raguRagu`.
**Why:** The PUT body must include the freshest `answers` and `timeLeftSeconds`, but updating the store on every keystroke (via `setSave(performSave)`) would cause Zustand to notify all subscribers and re-render the sidebar. The ref indirection makes the store's `save` slot a stable identity that always delegates to the latest closure.
**Alternatives:**
- Pass the save via `useImperativeHandle` on a `forwardRef` engine: rejected; requires touching the engine's ref API and the parent page's ref plumbing, and the sidebar (a sibling) still needs a way to reach it. Zustand is the lower-friction path.
- `setSave` on every change: works but wasteful — the sidebar re-renders unnecessarily when the modal is closed.

### 4. Guard activation: explicit `phase === "running" && !!attemptId`
**Decision:** Activate only when the engine is in the `running` phase and an attempt ID is set.
**Why:** In the `ready` phase the user has not started answering — there's nothing to lose. In the `result` phase the attempt is already finalised. Only the `running` phase has dirty in-memory state worth protecting.
**Alternatives:**
- Always guard when an attempt is mounted: rejected; would show the modal if a user clicks the Logout button before clicking "Mulai Tryout", which is just noise.
- Guard from `ready` onward: rejected; same noise.

### 5. `beforeunload`: native prompt, no custom message
**Decision:** Register a `beforeunload` listener that calls `e.preventDefault()` and sets `e.returnValue = ""`. Do NOT pass a custom string.
**Why:** Every modern browser (Chrome 51+, Firefox 44+, Safari 9+) ignores the custom `returnValue` string — they show a vendor-locked generic message ("Changes you made may not be saved"). Passing a custom string is a security surface and would be ignored anyway.
**Alternatives:**
- Page Visibility API / fullscreen custom modal that survives close: rejected; massive UX change, and the user explicitly asked for the alert pop up behavior.
- Custom `confirm()` in `onbeforeunload`: rejected; browsers ignore `confirm()` in `beforeunload` for the same security reason.

### 6. Save-and-leave failure handling: keep modal open, no third button
**Decision:** On save failure, surface the error inline inside the modal and keep it open so the user can retry. No "Tutup Paksa" / "Leave without saving" button.
**Why:** The user spec was explicit: two buttons only. Adding a third would contradict the spec. If the user wants an escape hatch, that is a follow-up change.
**Trade-off:** If the save keeps failing (sustained network outage), the user is trapped on the tryout page. Mitigated by the autosave running every 60s in parallel — at most 60s of progress is at risk, recoverable by waiting out the outage.

## Risks / Trade-offs

- **Modal re-render churn from `progress` updates** → The progress snapshot is written to the store on every `answers`/`timeLeft` change. Subscribers (sidebar) re-render on every snapshot, even when the modal is closed. **Mitigation:** `useNavGuardStore((s) => s.progress)` is a selector with strict equality, so the sidebar re-renders only when `progress` actually changes. The re-render is cheap (one `<Modal>` mount check).
- **Race between save completion and engine unmount** → When the user confirms "Simpan & Keluar", we `await save()` then `router.push()`. The page unmount triggers the engine's `useEffect` cleanup, which calls `navGuard.reset()`. The store is empty by the time the destination page mounts. **Mitigation:** `performSaveRef.current()` clears `timerRef.current` before resolving, so the engine's interval is dead by the time navigation happens.
- **`beforeunload` does NOT catch in-page navigations** → Closing the tab works, but clicking a `<Link>` in the page (if any) does not. **Mitigation:** The tryout page has no internal links during the running phase (back button only exists on `ready` and `result` screens), so this is a theoretical concern only.
- **Modal in `UserSidebar` couples layout to tryout flow** → The sidebar is part of the user layout, not the tryout page. Adding tryout-specific UI to the sidebar means every user page pulls in the modal mount. **Mitigation:** The modal is `open={!!pendingNavPath}` — when the guard is inactive, no state changes, no render cost beyond an extra `<Modal>` returning `null`.
- **Logstash from `formatTime(timeLeft)` string recomputed on every render** → trivial, included for free by the existing call site.
