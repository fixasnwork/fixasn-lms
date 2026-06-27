## 1. Motion utilities (globals.css)

- [x] 1.1 Add `@keyframes pa-rise`, `pa-fill`, `pa-pulse` to `app/globals.css` for the profile section's entrance, progress fill, and status-dot pulse

## 2. Nav-guard store

- [x] 2.1 Create `store/useNavGuardStore.ts` Zustand store with `isActive`, `save`, `progress` slots + `setActive` / `setSave` / `setProgress` / `reset` actions

## 3. Profile page: active-packages section

- [x] 3.1 Add `usePackages`, `useTryouts`, `useUserPayments`, `useAttemptHistory` hooks to `app/(user)/profile/page.tsx`
- [x] 3.2 Compute `ownedPkgIds` (pending|verified), `bestScoresByTryout` (best per tryoutId), `finishedTryoutIdsByPkg` (per packageId), and `activePackages` (owned AND date-available)
- [x] 3.3 Add `useSyncExternalStore`-based clock subscription for the remaining-days computation (avoids `react-hooks/purity` violation)
- [x] 3.4 Render the "Paket Aktif" section with header + count, loading state, empty state, and per-package cards (name, description, icon, status pill, progress bar, 3-col stats, validity row, CTAs)
- [x] 3.5 All motion gated by `motion-safe:` so reduced-motion users get static rendering

## 4. Tryout engine: extract save + register guard

- [x] 4.1 Extract `performSaveRef` (latest-closure ref) and rewrite the ref's value on every render in a `useEffect`
- [x] 4.2 Refactor `handleConfirmExit` to delegate to `performSaveRef.current()` so the in-engine modal and the new sidebar modal share one PUT path
- [x] 4.3 Add effect: when `phase === "running" && !!attemptId`, set `isActive = true` and bind `save = () => performSaveRef.current()`; reset on unmount
- [x] 4.4 Add effect: push `progress = { answered, total, timeLeftLabel: formatTime(timeLeft) }` to the store on every `answers`/`timeLeft` change while running
- [x] 4.5 Confirm existing `components/tryout/TryoutEngine.test.tsx` (6 tests) still passes after refactor

## 5. Sidebar: nav-guard modal

- [x] 5.1 Import `useNavGuardStore` + `Modal` + `Button` in `components/layouts/UserSidebar.tsx`
- [x] 5.2 Subscribe to `isActive` (via selector) and `progress` (via selector) and add local state for `pendingNavPath`, `navError`, `navSaving`
- [x] 5.3 Modify `handleNav` to short-circuit on same-path and to set `pendingNavPath` instead of routing when the guard is active
- [x] 5.4 Render the confirm modal with warning text, progress summary card (when available), inline error, and "Batal" / "Simpan & Keluar" buttons
- [x] 5.5 Wire "Simpan & Keluar" to read `useNavGuardStore.getState().save()`, await it, then `router.push(pendingNavPath)`; on error keep modal open and show message
- [x] 5.6 Leave the Logout button unguarded

## 6. Attempt page: beforeunload

- [x] 6.1 Add a `useEffect` in `app/(user)/tryout/[attemptId]/page.tsx` that registers a `beforeunload` listener while an in-progress attempt is loaded
- [x] 6.2 Listener calls `event.preventDefault()` and sets `event.returnValue = ""`; cleanup on unmount and on `data.attempt.finishedAt === true`

## 7. Verification

- [x] 7.1 `npx eslint` clean on all four modified/added source files
- [x] 7.2 `npm run build` succeeds (TypeScript pass, 30/30 static pages)
- [x] 7.3 `npx vitest run components/tryout/TryoutEngine.test.tsx` — 6/6 pass
