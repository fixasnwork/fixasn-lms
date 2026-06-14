## Context

The tryout runner (`components/tryout/TryoutEngine.tsx`) holds the user's answer selections in local `useState` and only flushes them to the server on `onFinish` — which fires from "Selesai" button click or timer expiry. A refresh, tab close, network drop, or accidental navigation mid-attempt erases all in-flight answers. Ragu-ragu flags already autosave via `queueFlagUpdate`; the new behavior extends autosave to the answer map itself.

The user has explicitly chosen a 60-second fixed cadence with a no-reset rule: a timer that's already running is not restarted by subsequent answer changes. A new answer change only starts a 60s timer if no timer is currently scheduled. This keeps the server load bounded and predictable.

Stakeholders: end users (no more lost progress); product (more durable attempt state for analytics).

## Goals / Non-Goals

**Goals:**
- Persist the runner's answer map to the server at most every 60 seconds, using a no-reset rule.
- Force-flush on `visibilitychange` (hidden), `pagehide` / `beforeunload` (closing), and component unmount.
- Use `navigator.sendBeacon` for unload events (synchronous, non-blocking) and `fetch` for everything else.
- Server is the source of truth on remount and on `visibilitychange` to visible — the engine rehydrates from `useAttempt`'s `answers`.
- Last-write-wins across tabs. No conflict UI, no lock.
- Reuse the existing `PUT /api/tryout-attempts/[attemptId]` endpoint (no new API).
- The finish-time `useUpdateAttempt` path (scores + final answers) is unchanged; the new autosave writes **only** `answers`, so it does not touch `finishedAt`.

**Non-Goals:**
- No real-time multi-tab sync (no BroadcastChannel, no storage events).
- No new attempt state for "disconnected" / "stale".
- No telemetry on autosave events.
- No change to scoring, no change to Ragu-ragu.

## Decisions

### Decision 1: Fixed 60s cadence with no-reset rule

**Why:** A "debounce-reset-on-change" approach would let a power user spam clicks and never flush until they stop clicking. The fixed-cadence approach is bounded: a user who keeps changing answers still gets a flush every 60s from the first change. Easier to reason about server load.

**Implementation:** A single ref tracks the active `setTimeout` handle. When `answers` changes:
- If the ref is `null`, schedule `setTimeout(flush, 60_000)` and store the handle.
- If the ref is non-null, do nothing — the existing timer will fire.

When the timer fires, the ref is cleared (`null`) and the next change schedules a fresh 60s timer.

**Alternatives considered:**
- Debounce (reset on every change) — rejected by user; can defer indefinitely.
- Throttle (fire at most once per 60s, reset on change) — semantically similar to "no-reset + immediate flush" but the user chose "no-reset + wait for the existing timer to fire", which means a single change can wait up to 60s. That's the chosen semantic.

### Decision 2: `sendBeacon` for unload, `fetch` for everything else

**Why:** `navigator.sendBeacon` is the only reliable way to fire a request during `pagehide`/`beforeunload` — `fetch` is often cancelled by the browser. But `sendBeacon` is fire-and-forget: no response, no error handling. It's correct for the "best effort, don't block unload" use case. For visibility-hidden and unmount, regular `fetch` is fine and lets us log/handle errors.

**Wire shape (sendBeacon):** `navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: 'application/json' }))`. The endpoint accepts the JSON body either way; sendBeacon requires a `Blob` to set the content-type (the standard form-encoded default is wrong here).

**Alternatives considered:**
- `fetch` with `keepalive: true` — viable, but `sendBeacon` is more portable and doesn't impose a 64KB request limit when using `Blob`.
- No unload flush — rejected, this is the moment where the user is most likely to lose work.

### Decision 3: Rehydrate on `visibilitychange` to visible

**Why:** If a user had the runner open in two tabs and made changes in tab A, tab B's local state is stale. The user explicitly chose "last write wins, no conflict UI", so the simplest correct behavior is: when tab B regains focus, it re-fetches the server state and overwrites its local answers. No toast, no merge.

**Implementation:** In the `visibilitychange` handler, when `document.visibilityState === 'visible'`, call `queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] })`. `useAttempt` refetches; `useAttempt`'s `data.answers` becomes the new source; the engine's local state is re-initialized from it via a `useEffect` on `preloadedAnswers` (or a one-time sync).

**Edge case:** If the user is mid-keystroke when rehydration overwrites the local state, the new answer is lost. Acceptable — last-write-wins is the chosen semantic.

### Decision 4: Engine is source of truth in-session; server is source of truth on mount/rehydrate

**Why:** During a single session, the user's clicks are the authoritative input. We don't want every `answers` change to round-trip to the server before re-rendering. Optimistic local updates are correct.

**Boundary:** `useEffect` on `attempt.answers` (from `useAttempt`) syncs server → local **only** at mount and on `visibilitychange→visible`. Local state mutations from clicks do not sync back to the local state from the server (the local state is the truth during the session).

### Decision 5: Reuse `PUT /api/tryout-attempts/[attemptId]`

**Why:** The endpoint already supports `{ answers }`-only bodies and upserts `AttemptAnswer` rows. The existing `useUpdateAttempt` calls it for finish; a new `useUpdateAttemptAnswers` calls it for autosave. Same wire shape, same auth, same idempotency.

**API contract:** The server's existing `body.answers` handler runs and the absence of score fields means `finishedAt` is not touched (per the previous change's gating).

### Decision 6: New mutation hook `useUpdateAttemptAnswers`

**Why:** Separates concerns from `useUpdateAttempt` (which writes scores + final answers + flips `finishedAt`). Same pattern as `useUpdateAttemptFlags` from the Ragu-ragu change — a small, focused hook.

**Optimistic update:** The hook merges the new answer map into the `useAttempt` cache so other components (e.g. the nav palette count) stay in sync between debounce cycles. Rollback on error.

### Decision 7: No rehydration while the user is mid-click sequence

**Why:** If `visibilitychange→visible` fires while the user is actively clicking, we don't want to interrupt them with a re-render that wipes their current selection. Mitigation: the `useEffect` that syncs `attempt.answers → answers` only runs on mount and on `attempt.answers` reference change (which the rehydrate invalidate triggers). The user's next click will read the new state. If a click lands in the same tick as the rehydrate, last-write-wins favors the user's click (it happens in the event handler, which runs after the effect).

## Risks / Trade-offs

- [Risk: `sendBeacon` 64KB request limit] → **Mitigation:** An answer map for 110 questions × ~2 bytes = ~2KB. Far under the limit.
- [Risk: Two tabs autosave at the same time → two PUTs → race] → **Mitigation:** Last-write-wins is the chosen semantic. Both PUTs succeed; whichever lands second wins. The user is fine with this.
- [Risk: 60s cadence means up to 60s of work is lost on a crash without `sendBeacon` firing] → **Mitigation:** Browsers fire `pagehide`/`visibilitychange` reliably in normal close flows. The only edge case is a hard crash (process killed) which is rare. Acceptable trade-off for the 60s cadence.
- [Risk: Rehydrate overwrites a user's in-flight click] → **Mitigation:** Last-write-wins, accepted by user. The next click after rehydrate will save the user's intent.
- [Risk: Two `useEffect`s (autosave + rehydrate) racing on mount] → **Mitigation:** Rehydrate runs synchronously from `useAttempt` data on mount; autosave is gated on `answers !== preloadedAnswers` (no false-positive flush on mount). Initial setup tested.
- [Trade-off: Extra server writes (~1 per minute per active attempt) vs. zero-progress-loss] → **Mitigation:** Bounded load; one row per question per PUT via upsert. Acceptable.

## Migration Plan

1. Deploy `useUpdateAttemptAnswers` hook (no behavior change until runner uses it).
2. Wire the autosave effect, lifecycle listeners, and `sendBeacon` flush into `TryoutEngine`.
3. Roll out behind the same code path — no kill switch needed; absence of use is a no-op on the server.
4. Rollback: revert the engine changes; the hook is unused.

## Open Questions

- Should the autosave run while the timer is at the "ready" / "result" phase? → **Resolved:** only during `phase === "running"`. No autosave before the user starts or after they finish.
- Should we disable the autosave during the last 5 seconds of the timer to avoid race with the auto-finish? → **Resolved:** yes, skip autosave when `timeLeft < 5000ms` (the finish path is about to fire and would conflict).
