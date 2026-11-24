# Code Context: Tryout Functionality (End-to-End)

> November 2026 option-weight update: admin Bank Soal now supports nonnegative integer scores per answer option for TWK, TIU, and TKP. The existing `QuestionOption.tkpValue` / static `tkpValues` fields carry weights for all three categories; no schema migration is needed. `getScore` uses an explicit option weight (including zero), falling back to correct=1 / wrong=0 for legacy TWK/TIU options without a weight, and 0 for unweighted TKP or unanswered questions. TWK/TIU retain `correctAnswer` for correctness statistics and review feedback. Admin create/update endpoints validate and preserve weights; admin tables and review display them. New TWK/TIU forms start with correct=1 / other=0; admins can change every option's weight. Saved historical attempt totals are not recalculated. Tests were updated but not executed.

> November 2026 review UI update: `TryoutReviewMode` now renders `ReviewQuestionPlayer`, matching the live player's two-column layout, sticky header, desktop navigator, and mobile bottom sheet. Completed-attempt history opens this review directly. Finishing a tryout now navigates to `/tryout/[attemptId]/hasil` after saving succeeds, showing a `TryoutCompletion` card with Lihat Pembahasan and Kembali ke Daftar Tryout, per-category correct/wrong/empty statistics, the saved total score, and the viewer's all-time per-tryout ranking (best score, periodically refreshed). `lib/tryoutResult.ts` computes these statistics; TKP correct means a highest-weight option, including ties, while missing keys/weights are counted separately as ungraded. The standalone engine uses the same completion card before revealing review. Timer expiry awaits the same finish flow and shows a retryable error if saving fails. Answers are read-only; TWK/TIU show correct/wrong/empty states, while TKP shows option weights and all highest-scoring options. Option images and explanation images (including image-only explanations) are supported. The Pembahasan/Ranking tabs and eager ranking fetch have been removed from this view; ranking work is deferred. The navigator summary shows correct/wrong/empty counts, without a TKP answered card. Category score cards use blue (TWK), violet (TIU), and amber (TKP) fills. `PembahasanNavigator` is no longer used by the engine. The older component descriptions below predate this update.

> November 2026 update: see `PACKAGE_ACCESS.md`. Paid access now requires a verified, unexpired payment. Pending payments no longer unlock content. Package dates control sales only; individual access expires using the duration captured at checkout. This supersedes the older pending-access descriptions below.

Last updated: 2026-06-21. Scoped by combining two parallel scouts — runner side (`deleg_c0da6710`, 22 tool calls, 457s) and data/admin side (`deleg_b2b0e6b1`, 28 tool calls, 466s) — plus targeted follow-ups on auth leaks, the autosave spec, and `useAutosaveAnswers.ts`. Use this doc as the canonical map when changing anything under `app/(user)/tryout/`, `components/tryout/`, `app/api/tryout-attempts/`, `app/api/tryouts/`, or the related Prisma models.

Branch: `staging` (clean, no uncommitted changes as of this snapshot).

---

## 1. User-Facing Flow

### 1.1 `/tryout` — tryout list page

`app/(user)/tryout/page.tsx` (396 lines, `"use client"`). Three sections rendered:

- **Trial card** (`page.tsx:111-139`) — only when a `tryout.isTrial === true` exists for any package. Gold styling.
- **Available (unpurchased) packages** (`page.tsx:142-185`) — shows price + "Beli" → `/buy`.
- **Owned packages** with "Mulai" button (`page.tsx:188-298`) — shows progress `N/N`, "Mulai" → `useCreateOrResumeAttempt`.
- **Finished-attempts list** (`page.tsx:308-391`) — reverse-chronological, renders `<FinishedAttemptCard>` per attempt. Card has one "Lihat Pembahasan" button → `router.push('/tryout/' + attemptId)`.

**Data sources** (`page.tsx:22-29`):

| Hook | API | Notes |
| --- | --- | --- |
| `usePackages()` | `GET /api/packages` | Lightweight metadata only. |
| `useTryouts()` | `GET /api/tryouts` | Grouped by `packageId`; each item carries `_questionCount`. |
| `useUserPayments(userEmail)` | `GET /api/payments?userId=…` | "Honor system" — no ownership check on the API. |
| `useAttemptHistory(userEmail)` | `GET /api/tryout-attempts?userId=…` | Same — any email-shaped userId works. |
| `useCreateOrResumeAttempt()` | `POST /api/tryout-attempts/resume` | Resume-or-create; returns `{success, attempt: {id, tryoutId, isNew}}`. |

**Auth gate:** none in this file. All gating is upstream in `app/(user)/layout.tsx:14-26` (server component).

**Prefetching:** none at the page level. The `(user)` layout **pre-fetches `['packages']` and `['banks']`** via `<HydrationBoundary>` (`layout.tsx:43-61`). Tryouts, payments, and attempt-history all fetch client-side and may waterfall.

**Start action** (`page.tsx:85-88`): awaits `createOrResumeAttempt.mutateAsync(tryoutId)` → `router.push('/tryout/' + attemptId)`. If the backend returns an existing in-progress attempt, the new attempt page hits `useAttempt` and lands in the engine directly.

### 1.2 `/tryout/[attemptId]` — attempt page

`app/(user)/tryout/[attemptId]/page.tsx` (122 lines, `"use client"`). Four branches:

1. **Loading** spinner (`page.tsx:22-31`).
2. **Error / not-found** (`page.tsx:33-55`) — uses `error.message` from `useAttempt`. Generic message; doesn't distinguish "not found" from "stale session" from "auth required".
3. **Completed attempt** → `<TryoutReviewMode questions={tryout.questions} answers={attempt.answers} raguRaguFlags={attempt.raguRagu ?? {}} scores={…} onBack onRetry />` (`page.tsx:62-92`).
4. **In-progress attempt** → `<TryoutEngine>` with `preloadedAnswers={attempt.answers}` and `preloadedRaguRagu={attempt.raguRagu ?? {}}` (`page.tsx:96-121`).

`params` is a `Promise` and `use()`-d at line 16 — Next 16 async-params convention.

**Data source:** `useAttempt(attemptId)` (`hooks/useTryoutQueries.ts:150-162`) → `GET /api/tryout-attempts/{attemptId}` with `staleTime: 0` (always refetches).

**Auth gate:** server-side via `requireActiveSession` in the API (see §3.2). The page itself has no auth check.

**`onFinish` callback** (`page.tsx:105-118`):

1. `calculateScoring(tryout.questions, answers)` (see §6).
2. `useUpdateAttempt.mutateAsync({ twkScore, tiuScore, tkpScore, totalScore, answers })` PUTs to `/api/tryout-attempts/{attemptId}`. The server stamps `finishedAt = new Date()` when score fields are present (see §3.2 PUT).
3. **No navigation away** — the user stays on the result view in `TryoutEngine` (or returns via `onBack`).

### 1.3 Loading + error boundaries

- `app/(user)/tryout/loading.tsx` and `error.tsx` (39 lines, "Gagal Memuat Tryout").
- `app/(user)/tryout/[attemptId]/loading.tsx` and `error.tsx` (39 lines, "Tryout Tidak Ditemukan") — both have "Coba Lagi" + "← Kembali" buttons.

---

## 2. Attempt Runner Components

Directory: `components/tryout/` (4 source files + 3 test files).

### 2.1 `TryoutEngine.tsx` (726 lines)

The live runner. Three internal phases: `ready` (start screen) → `running` (questions) → `result` (post-submit score + pembahasan).

**Props** (`TryoutEngine.tsx:146-156`):

```ts
attemptId?: string;
questions: Question[];
durationMin: number;
setName?: string;
isTrial?: boolean;
onFinish?: (answers: Record<number, number>) => void;
onBack?: () => void;
preloadedAnswers?: Record<number, number>;
preloadedRaguRagu?: Record<number, boolean>;
```

**Internal state** (`TryoutEngine.tsx:170-184`): `answers`, `raguRagu`, `cur`, `timeLeft`, `phase`, `showMobileNav`, `timerRef`, `shouldRehydrate` ref (vestigial — set by the autosave hook but never read by the engine's rehydration effect at L196-205), `prevPreloaded` ref.

**Hooks used** (`TryoutEngine.tsx:8-9, 169, 186-191`):

- `useLogoConfig()` — header brand mark.
- `useUpdateAttemptFlags(attemptId)` — **immediate (non-debounced)** ragu-ragu writes on finish and on timer expiry.
- `useAutosaveAnswers({ attemptId, phase, timeLeft, shouldRehydrateRef })` — see §4.

**Key behaviors:**

- **Start** (`TryoutEngine.tsx:218-233`): `phase → running`, 1-second `setInterval` countdown. When `timeLeft <= 1`: clear timer, `phase → result`, `updateFlags.mutate(raguRagu)` (fire-and-forget), `onFinish(answers)`.
- **Finish button** (`TryoutEngine.tsx:235-240`): awaits `updateFlags.mutateAsync(raguRagu)`, then `onFinish(answers)`, then `phase → result`.
- **Ragu-ragu toggle** (`TryoutEngine.tsx:207-216`): flips local `raguRagu[index]`, then **queues a debounced PUT** via `queueFlagUpdate(attemptId, { [index]: next[index] })` (250 ms debounce, fire-and-forget). Final write still goes through `useUpdateAttemptFlags` at finish or timer end.
- **Answer selection** (`TryoutEngine.tsx:523-528`): `setAnswers({...answers, [cur]: j})` + `tryScheduleAutosave()`. No immediate PUT — autosave waits for 60s cadence or lifecycle event.
- **Timer** (`TryoutEngine.tsx:218-233`; visual: L446-453): `MM:SS` on mobile, `HH:MM:SS` on desktop (built by string-splitting the `MM:SS` output of `formatTime`), turns red when `timeLeft < 300`. **No warning at e.g. 1 min remaining. Not paused when tab is hidden** — see §10.
- **Question navigator** — inline as `QuestionGrid` (`TryoutEngine.tsx:32-143`). Two variants: `sidebar` (desktop, sticky) and `modal` (mobile, full-screen `<Modal>`). Per-section (TWK/TIU/TKP) 5/6-column grids. Active = section color with ring; Answered = section bg; Unanswered = gray; Ragu-ragu dot (yellow 8px circle, L107-112). Progress bar `answered/total` + per-section `done/total` counters. Legend at bottom.
- **Result phase** (`TryoutEngine.tsx:326-382`): big score card, per-category TWK/TIU/TKP pass-fail vs thresholds (65/80/166), `<PembahasanNavigator>` for review.
- **`retry` handler** (`TryoutEngine.tsx:249-255`): clears state, returns to `ready` phase. **Does NOT create a new attempt** — just rewinds the in-memory state. The real retry path is from the completed review (page.tsx:74-90), which calls `POST /api/tryout-attempts/resume` to mint a new attempt.
- **No visible autosave indicator.** Spec is silent. UX gap (see §10).

### 2.2 `TryoutReviewMode.tsx` (309 lines)

The pembahasan screen for finished attempts.

**Props** (`TryoutReviewMode.tsx:9-25`):

```ts
questions, answers, name, scores, raguRaguFlags = {}, onBack, onRetry
```

Behavior: header with TWK/TIU/TKP/Total scores; question navigator row (L65-117, colored per correctness); ragu-ragu summary banner (L120-135): "X dari Y soal ditandai Ragu-ragu"; "🔄 Ulangi Tryout" button (L138-142); per-question card: status pill, options with green/red/violet highlight, explanation block.

**No mutations, no network calls.**

### 2.3 `PembahasanNavigator.tsx` (245 lines)

Used inside the result phase of `TryoutEngine` (`TryoutEngine.tsx:372-378`). Accepts `questions`, `answers`, `name?`, `onBack?`, `onRetry?` and renders the pembahasan card with the same coloring rules.

**Duplicates `TryoutReviewMode` logic.** No shared "what color/label does this question's status get?" helper (`TryoutReviewMode.tsx:30-38` vs `PembahasanNavigator.tsx:30-33`). Any visual or scoring-presentation change has to be made in both places.

### 2.4 `FinishedAttemptCard.tsx` (65 lines)

List-page card.

**Props** (`FinishedAttemptCard.tsx:5-15`): `attemptId, tryoutName, packageName, finishedAt, totalScore, twkScore, tiuScore, tkpScore, onView`.

No mutations, no network. Renders "Lihat Pembahasan" → `onView(attemptId)` → `router.push('/tryout/' + id)` (page.tsx:374).

### 2.5 Test files

`TryoutReviewMode.test.tsx`, `FinishedAttemptCard.test.tsx`. Co-located.

---

## 3. Server APIs (auth matrix)

| Route | Method | Auth on user-facing calls | Hot path? |
| --- | --- | --- | --- |
| `/api/tryout-attempts` | GET | **none** | history list (page-level) |
| `/api/tryout-attempts` | POST | **none** | legacy, **dead code** — not called by runner |
| `/api/tryout-attempts/[id]` | GET | `requireActiveSession` | **main runner entry** |
| `/api/tryout-attempts/[id]` | PUT | `requireActiveSession` | **answer/flag/score writes** |
| `/api/tryout-attempts/resume` | POST | `requireActiveSession` | **start/resume entry** |
| `/api/tryouts` | GET | **none** | yes (auto-seeds on empty DB) |
| `/api/tryouts/[id]` | GET | **none** | metadata only |
| `/api/tryouts/[id]/questions` | GET | **none** | **LEAKS `correctAnswer`** — see §10 |
| `/api/tryouts/[id]/questions/[qid]` | PUT/DELETE | `requireAdmin` | admin only |
| `/api/tryouts/seed` | POST | **none** | admin script, no caller |

### 3.1 `/api/tryout-attempts` (`app/api/tryout-attempts/route.ts`, 127 lines)

**GET** (L16-37): query `?userId=X&tryoutId=Y` (optional tryoutId). 400 if no userId. Returns `prisma.tryoutAttempt.findMany({ where: {userId, tryoutId?}, include: {answers: true}, orderBy: {createdAt: 'desc'} })`. **Auth gap:** no session check — any email-shaped userId returns that user's history.

**POST** (L45-127): body `{userId, userName, tryoutId, answers?, twkScore?, tiuScore?, tkpScore?, totalScore?}`. Validates required fields. Fetches tryout + linked packages; applies `isAvailable(tryout)` and `isPackageAvailable` checks on every linked package. Returns 403 `{error: "tryout_unavailable", reason: "out_of_window"|"package_closed", retryable: true}` on failure. `answers` may be array of `{questionIndex, selectedOption}` OR a `Record<index, option>`; both normalize to `AttemptAnswer.create` rows. `selectedOption` clamped to `Math.max(-1, opt)`. **Not used by runner** — duplicate of resume.

### 3.2 `/api/tryout-attempts/[attemptId]` (`[attemptId]/route.ts`, 223 lines)

**GET** (L62-136): auth `requireActiveSession`. 401 → `clearDeviceSecretCookie`. Stale session → 401 `STALE_SESSION_MESSAGE`. Prisma include chain:

```ts
prisma.tryoutAttempt.findUnique({
  where: {id: attemptId, userId: session.user.email, deletedAt: null},
  include: {
    answers: {orderBy: {questionIndex: 'asc'}},
    tryout: {include: {
      tryoutQuestions: {orderBy: {sortOrder: 'asc'}, include: {
        question: {include: {options: {orderBy: {optionIndex: 'asc'}}}}
      }}
    }}
  }
})
```

404 if not found / not owned. Response: `{ attempt: {id, userId, tryoutId, twk/tiu/tkp/totalScore, finishedAt, answers, raguRagu, createdAt, updatedAt}, tryout: {id, name, isTrial, sortOrder, durationMin, questions} }`. `raguRagu` is built by iterating `attempt.answers` (L106-110) — flagged questions always have a row, unflagged never do, so clearing ragu-ragu requires deleting the row.

**PUT** (L138-223): auth `requireActiveSession`. Ownership re-check at L152-157 (`userId: session.user.email`). Body: `{ answers?, raguRaguFlags?, twkScore?, tiuScore?, tkpScore?, totalScore? }`. Behaviors:

- **Answer upsert** (L160-170): each `(idx → opt)` upserted via `where: {attemptId_questionIndex: {attemptId, questionIndex: idx}}`. `selectedOption` clamped `>= -1`. Create-path sets `raguRagu: false`.
- **Flag upsert** (L174-184): each `(idx → flagged)` upserted. `update: {raguRagu: Boolean(flagged)}`, `create: {selectedOption: -1, raguRagu: Boolean(flagged)}`. **Absent keys are NOT touched** (server is non-destructive).
- **`finishedAt` stamping** (L192-207): detected by any score field being defined. **First time only**: sets `finishedAt = new Date()` if `existing.finishedAt` is null. Subsequent PUTs (resubmits) preserve it.
- Returns `{success, attempt: {id, totalScore, finishedAt, updatedAt}}` — note this omits per-question answers, so the autosave flow has nothing to merge back; the client uses `useAttempt` refetch instead.

**sendBeacon caveat:** autosave hook sends `{answers: {...}}` as JSON-stringified Blob with no Content-Type (`useAutosaveAnswers.ts:99-105`). Server's `request.json()` requires `Content-Type: application/json` and **will throw** on a sendBeacon Blob. See §10.

### 3.3 `/api/tryout-attempts/resume` (`resume/route.ts`, 119 lines)

**POST** (L10-119): body `{ tryoutId: number }`. Fetches tryout (404 if not found / soft-deleted). **Access gate for non-trial** (L30-40): `prisma.payment.findFirst({where: {userId: session.user.email, status: in [pending, verified], package: {packageTryouts: {some: {tryoutId}}}}, select: {package: {select: {startDate, endDate}}}})`. 403 if no matching payment. **In-progress detection** (L53-73): `prisma.tryoutAttempt.findFirst({userId, tryoutId, deletedAt: null}, orderBy: {createdAt: 'desc'})` — if latest has `finishedAt === null`, return it as `{success, attempt: {id, tryoutId, isNew: false}}`. **Uses `finishedAt`, not `totalScore`** (commit 4cf4258 fix). **New attempt path** (L75-118): applies `isAvailable(tryout)` and (for non-trial) `isPackageAvailable(accessPayment.package)` — *only the package the user paid through* (commit 0e04cd1 regression fix). 403 `tryout_unavailable / package_closed` if either gate fails. Creates a fresh `TryoutAttempt` with zero scores. Response: `{success, attempt: {id, tryoutId, isNew: boolean}}`.

### 3.4 `/api/tryouts/[tryoutId]` (`[tryoutId]/route.ts`, 246 lines)

| Method | Auth | Behavior |
| --- | --- | --- |
| GET | **none** | Returns tryout metadata only (no questions). 400 invalid id, 404 not found / soft-deleted (L10-41). |
| PUT | `requireAdmin` (L70) | Full update `name`/`isTrial`/`sortOrder`/`durationMin`/`startDate`/`endDate`. Rejects `startDate >= endDate`. 400/404. |
| PATCH | `requireAdmin` (L154) | Single-purpose: update only `durationMin`. Used by admin soal page. |
| DELETE | `requireAdmin` (L203) | Soft-delete + transactional `packageTryout.deleteMany`. **409** if any `TryoutAttempt` rows exist (L220-230). |

### 3.5 `/api/tryouts/[tryoutId]/questions` (`[tryoutId]/questions/route.ts`, 227 lines)

| Method | Auth | Behavior |
| --- | --- | --- |
| GET | **none** (L104-152) | `Question[]` with options ordered by `optionIndex`. Filters `deletedAt: null` on tryout. **Returns `correctAnswer`, `explanation`, `optionImage` unauthenticated — LEAK (see §10).** |
| POST | `requireAdmin` (L158) | Body: `{ category, question, questionImage, correctAnswer, explanation, explanationImage, options: [{ optionIndex, optionText, optionImage, tkpValue }] }`. Validates category ∈ TWK/TIU/TKP, `question \|\| questionImage`, ≥2 options (text trimmed OR image), non-TKP must have `correctAnswer` ∈ [0,4]. Normalizes options: truncates to 5, drops empty (L28-38). Single transaction: creates `Question` + nested options, then appends `TryoutQuestion` row with `sortOrder = (lastLink?.sortOrder ?? 0) + 1`. |

### 3.6 `/api/tryouts/[tryoutId]/questions/[questionId]` (`[questionId]/route.ts`, 195 lines)

| Method | Auth | Behavior |
| --- | --- | --- |
| PUT | `requireAdmin` (L108) | Same body shape as POST. **Requires the `TryoutQuestion` link to exist** (L125-131, else 404). Transaction: updates `Question`, **deletes all options then re-creates** (L147-156). Link row left in place. |
| DELETE | `requireAdmin` (L175) | **Only deletes the `TryoutQuestion` join row** (L186-188), not the `Question`. So `Question` rows persist after "delete" and can be referenced by other tryouts. Matches `admin-settings-catalog-management` spec "Tryouts are shared entities across packages". |

**Note:** this route is NOT used by the runner for answer saving. The runner writes per-user answers via `PUT /api/tryout-attempts/[attemptId]` (§3.2). This is admin-side content management only.

### 3.7 `/api/tryouts` (`route.ts`, 478 lines)

- **GET** (L328-414): no auth. Query params: `?packageId=N`, `?include=questions` (adds nested questions+options incl. `correctAnswer` — LEAK on `include=questions`, see §10), `?scope=all` (flat list). Filters `deletedAt: null`. **If no tryouts for `packageId`, returns `DEFAULT_PACKAGE_BANKS` raw** (L345). If no tryouts at all, calls `seedFromDefaults()` (L143-242, no-auth idempotent re-seeder, errors silently swallowed in try/catch) then re-queries; if still empty, returns static. Response: `{ tryouts: Record<packageId, Tryout[]>` by default; flat `Tryout[]` when `scope=all`.
- **POST**: `requireAdmin`. Body `{ name, isTrial, sortOrder, durationMin, startDate, endDate }`. Validates name non-empty, duration 1-300, dates parseable and `startDate < endDate` when both set.

### 3.8 `/api/tryouts/seed` (`seed/route.ts`, 130 lines)

**`POST /api/tryouts/seed` — no auth, no admin guard.** Idempotent bulk-upsert from `DEFAULT_PACKAGE_BANKS`. Returns `{ success: true, seeded: <count> }`. **No call site in the app invokes it.** Security gap if exposed publicly (see §10).

---

## 4. Client Hooks

### 4.1 `hooks/useTryoutQueries.ts` (668 lines)

The runner-relevant exports:

| Export | Line | queryKey | API | Invalidations |
| --- | --- | --- | --- | --- |
| `usePackages` | 282-293 | `['packages']` | `GET /api/packages` | — |
| `useTryouts` | 5-15 | `['tryouts']` | `GET /api/tryouts` | — |
| `useTryoutsWithQuestions` | 17-27 | `['tryouts','questions']` | `GET /api/tryouts?include=questions` | — |
| `useTryoutQuestions` | 29-41 | `['tryout-questions', id]` | `GET /api/tryouts/{id}/questions` | — |
| `useUserPayments` | 44-56 | `['payments', userId]` | `GET /api/payments?userId=…` | — |
| `useCreatePayment` | 65-83 | — | `POST /api/payments` | `['payments']` |
| `useUploadProof` | 92-103 | — | `POST /api/upload` | — |
| `useCreateOrResumeAttempt` | 106-129 | — | `POST /api/tryout-attempts/resume` | `['attempt-history']` |
| `useAttempt` | 150-162 | `['attempt', attemptId]` | `GET /api/tryout-attempts/{attemptId}` | `staleTime: 0` |
| `useUpdateAttempt` | 165-189 | — | `PUT /api/tryout-attempts/{attemptId}` (score+answers) | `['attempt', id]` + `['attempt-history']` |
| `queueFlagUpdate` (function, not hook) | 218-224 | — | `PUT /api/tryout-attempts/{attemptId}` `{raguRaguFlags}` | debounced 250ms |
| `useUpdateAttemptAnswers` | 229-241 | — | `PUT /api/tryout-attempts/{attemptId}` `{answers}` | **none** (fire-and-forget) |
| `useUpdateAttemptFlags` | 243-279 | — | `PUT /api/tryout-attempts/{attemptId}` `{raguRaguFlags}` | optimistic + onSettled `['attempt', id]` |
| `useAttemptHistory` | 369-390 | `['attempt-history', userId]` | `GET /api/tryout-attempts?userId=…` | — |
| `useLogoConfig` | 355-366 | `['logo-config']` | `GET /api/logo-config` | — |

**`useAttempt` shape** (`useTryoutQueries.ts:131-148`): `{ attempt: {id, userId, tryoutId, twk/tiu/tkp/totalScore, finishedAt, answers, raguRagu, createdAt, updatedAt}, tryout: Tryout }`.

**`queueFlagUpdate`** (L196-224): module-level debouncer — `flagDebouncers: Map<attemptId, {timer, latest}>`. Each call: merges new flags into `latest`, clears any existing timer, sets a 250 ms timer. When fired, `flushFlags` does a raw `fetch(... {method:'PUT'})` with no error surfacing. Empty payloads short-circuit. **No revalidation** — relies on next `useAttempt` refetch for reconciliation.

**`useUpdateAttemptFlags`** (immediate, non-debounced, L243-279):

- `onMutate`: optimistic merge into `['attempt', attemptId]` cache.
- `onError`: rolls back to `ctx.prev`.
- `onSettled`: invalidates `['attempt', attemptId]`.

**`useUpdateAttemptAnswers`** (L229-241): pure fire-and-forget. **No invalidation, no optimistic update.** Per spec, server is source of truth on the next mount/focus/visibility re-fetch.

**localStorage / rehydration:** TanStack Query cache is the rehydration store. **No localStorage** anywhere in the hooks — answers live in memory + server only.

### 4.2 `hooks/useAutosaveAnswers.ts` (125 lines)

`AUTOSAVE_DELAY = 60_000` (L7).

**Contract** (L9-19):

```ts
useAutosaveAnswers({ attemptId, phase, timeLeft, shouldRehydrateRef })
→ { tryScheduleAutosave, flushAnswers, syncAnswers }
```

**Internal refs** (L22-34): `timerRef`, `answersRef`, `flushRef`, `schedRef`, `phaseRef`, `timeRef`, `attemptRef`. All updated on every render via direct `phaseRef.current = phase` etc. — eslint-disabled.

**`tryScheduleAutosave`** (L71-73) → `schedRef.current()` which:

- Bails if `phase !== 'running'` or `timeLeft < 5000` (L58).
- Bails if `Object.keys(answers).length === 0`.
- Bails if a timer is already running — **60s no-reset rule** (matches spec).
- Otherwise schedules `setTimeout(updateAnswers.mutate(current), 60_000)`. When it fires, also clears `timerRef.current` so a subsequent change schedules a fresh 60s.

**`syncAnswers(a)`** (L25-27): simple ref writer, called by the engine every render so the latest answer map is what the timer/visibility handlers read.

**`flushAnswers()`** (L75-77): cancels pending timer, sends the current `answersRef.current` immediately via `updateAnswers.mutate`. Used on visibility-hidden, pagehide, beforeunload, and unmount cleanup.

**`useEffect` on `phase/timeLeft`** (L80-87): if phase leaves "running" or timeLeft drops below 5s, clear any pending timer. Implements "no autosave in final 5s" rule.

**`useEffect` on mount** (L90-122): installs three listeners:

1. `visibilitychange`:
   - `hidden` → `flushRef.current()`.
   - `visible` → sets `shouldRehydrateRef.current = true` and `queryClient.invalidateQueries({queryKey:['attempt', attemptId]})`.
2. `pagehide` and `beforeunload`: `navigator.sendBeacon` with JSON Blob. **BUG: see §10.**
3. Component unmount: `flushRef.current()` + listener removal.

### 4.3 sendBeacon bug (likely)

`useAutosaveAnswers.ts:99-105`:

```ts
const handlePageHide = () => {
  const blob = new Blob(
    [JSON.stringify({ answers: answersRef.current })],
    { type: 'application/json' },
  );
  if (attemptRef.current) navigator.sendBeacon(`/api/tryout-attempts/${attemptRef.current}`, blob);
};
```

`navigator.sendBeacon` has a hard requirement: only sends `Blob` with `Content-Type` the browser considers "simple" — which does **not** include `application/json`. Browsers strip it and send as `text/plain` (or no type at all). The server's `await request.json()` at `app/api/tryout-attempts/[attemptId]/route.ts:149` then throws. **The sendBeacon path is effectively broken.** The test in `useAutosaveAnswers.test.ts:163-167` mocks `sendBeacon` directly and never exercises the real fetch → server pipeline, so the bug is invisible in tests. The `visibilitychange → hidden` flush uses a normal `updateAnswers.mutate(...)` (the fire-and-forget mutation) and works fine.

---

## 5. Scoring

`lib/scoring.ts` (31 lines, pure functions, no side effects).

### 5.1 `getScore(q, answerIdx)` — `lib/scoring.ts:3-10`

```ts
if (answerIdx === undefined || answerIdx === null) return 0;
if (q.category === "TKP") {
  const opt = q.options[answerIdx];
  return opt?.tkpValue ?? 0;
}
return answerIdx === q.correctAnswer ? 1 : 0;
```

Rules:

- **TWK & TIU:** correct = 1 point, wrong or missing = 0. **No negative scoring.**
- **TKP:** uses the option's `tkpValue` (typically 1–5 per option, set by admin in `data/questions.ts` and stored in `QuestionOption.tkpValue` Int?). Missing option index = 0.
- **Required inputs:** fully-loaded `Question` (must have `category`, `correctAnswer` for non-TKP, `options[].tkpValue` for TKP) + user's selected option index.

### 5.2 `calculateScoring(questions, answers)` — `lib/scoring.ts:12-21`

Sums per category using `getScore`, returns `{TWK, TIU, TKP, total}`. Used by:

- `app/(user)/tryout/[attemptId]/page.tsx:107` — final scores before the `useUpdateAttempt` PUT.
- `TryoutEngine.tsx:243-247` — live totals for the result card.

### 5.3 Other helpers

- `formatTime(seconds)` (L23-27) → `MM:SS` zero-padded. **Engine renders `HH:MM:SS` on desktop and `MM:SS` on mobile** by splitting this string at `TryoutEngine.tsx:412`. Underlying helper only emits `MM:SS`. **Bug:** if `durationMin > 99`, the timer rolls over past 99:59 and shows only `99:XX` because the helper can't produce a 3-digit minute field. No `HH:MM:SS` variant.
- `formatCurrency(amount)` — not used by the runner.

### 5.4 Thresholds

TWK pass = 13 correct (out of 30), TIU pass = 16 correct (out of 35), TKP pass = 166. Hard-coded in `TryoutEngine.tsx:487-489` and the page header at `TryoutEngine.tsx:483`. **Not read from any config** — change requires code edit.

---

## 6. Auth Gate for Attempts

### 6.1 Page-level (server)

`app/(user)/layout.tsx:14-26`:

```ts
const session = await auth();
if (!session?.user) redirect('/login');
if (isSessionStale === true) redirect('/login');
if (role !== 'user') redirect('/login');
prisma.user.findUnique({where: {email}, select: {isBlocked: true}});
// if isBlocked → redirect('/banned')
```

Uses `auth()` from `@/auth` (NextAuth v5) which reads the session cookie.

### 6.2 API-level: `lib/routeAuth.ts` (75 lines)

`requireActiveSession(request)` — `lib/routeAuth.ts:30-75`:

1. `const session = (await auth()) as Session | null` (L31).
2. `!session?.user || !email` → 401 `Unauthorized` + `clearDeviceSecretCookie` (L34-38).
3. `isAdminRole(role)` → allow through (admins skip device-secret checks) (L41-44).
4. `prisma.user.findUnique({where: {email}, select: {isBlocked: true}})` → if `isBlocked`, 403 `Account blocked` (L47-54).
5. `activeSession.isSessionStale === true` → 401 `STALE_SESSION_MESSAGE` + `clearDeviceSecretCookie` (L56-60).
6. `validateNonAdminActiveSession({email, tokenSessionVersion, deviceSecret})` from `lib/deviceSession.ts:86-122`. If `!ok` → 401 `STALE_SESSION_MESSAGE` + `clearDeviceSecretCookie` (L62-72).
7. Otherwise return `{ok: true, session: activeSession}`.

**Used by:** `/api/tryout-attempts/[attemptId]` (GET + PUT), `/api/tryout-attempts/resume` (POST).

### 6.3 `lib/deviceSession.ts` (122 lines)

Single-active-device enforcement:

- `DEVICE_SECRET_COOKIE_NAME = 'fxns_state'` (L6).
- `STALE_SESSION_MESSAGE = 'Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan.'` (L7).
- `generateDeviceSecret()` — 32 random bytes, base64url (L12-14).
- `hashDeviceSecret(secret)` — SHA-256 hex (L16-18).
- `applyDeviceSecretCookie(response, secret)` — httpOnly, lax, 30-day maxAge, `secure` in prod (L49-59).
- `clearDeviceSecretCookie(response)` — sets maxAge 0 (L61-71).
- `validateNonAdminActiveSession({email, tokenSessionVersion, deviceSecret})` (L86-122) — fetches `prisma.user.findUnique({where: {email}, select: {activeSessionVersion, activeDeviceSecretHash}})` and rejects:
  - 401 `user-not-found` if no user.
  - 401 `missing-session-version` if either token or DB is null.
  - 401 `version-mismatch` if `tokenSessionVersion !== user.activeSessionVersion`.
  - 401 `missing-device-secret-hash` if no hash stored.
  - 401 `missing-device-secret-cookie` if cookie missing.
  - 401 `invalid-device-secret` if `hashDeviceSecret(cookie) !== user.activeDeviceSecretHash`.

### 6.4 Stale-session flow during a tryout

1. User A logs in on phone → DB: `activeSessionVersion=1, activeDeviceSecretHash=<hash-of-phone-secret>`. Phone cookie: `fxns_state=<phone-secret>`.
2. User A logs in on laptop → bumps `activeSessionVersion` to 2 and rotates `activeDeviceSecretHash` to `<hash-of-laptop-secret>`. Phone token carries `activeSessionVersion=1` which ≠ DB `2` → 401 `STALE_SESSION_MESSAGE` on next request.
3. Mid-tryout: phone runner open when user signs in on laptop → next autosave PUT (PUT `/api/tryout-attempts/{id}`) 401s because `requireActiveSession` fails. `useUpdateAttemptAnswers` returns the error; **the hook does not surface it** — user keeps answering in-memory, no further PUTs succeed. Next `useAttempt` refetch also 401s → "Tryout Tidak Ditemukan" page (generic — doesn't say "session ended on another device").
4. `clearDeviceSecretCookie` wipes the phone's `fxns_state` cookie. User is effectively logged out.

**Resume flow** (`/api/tryout-attempts/resume`) is also guarded — can't start a new attempt on a stale session either.

---

## 7. Prisma Schema (tryout-related models)

`prisma/schema.prisma`.

### 7.1 `User` (L20-46)

- `id String @db.Uuid` PK, `dbgenerated("uuid_generate_v7()")`.
- `email String @db.Text` unique — used as natural key for every transactional FK (`Payment.userId`, `UserPurchase.userId`, `TryoutAttempt.userId`).
- `name`, `avatar`, `role` (default `"user"`).
- `isBlocked Boolean @default(false)`, `blockedAt DateTime?`, `blockedReason String?`.
- Soft-delete `deletedAt DateTime?`.

### 7.2 `Package` (L95-118)

- `id Int` autoinc, `name` unique, `tryoutCount Int @default(0)` (cached count, kept in sync via `setPackageTryouts`).
- `price Int @default(0)`.
- `startDate DateTime?`, `endDate DateTime?`. **No `isActive`.**
- **No `popular` column.** A prior v1 had one — `db/migrate-v1-to-v2.sql:127` `ALTER TABLE packages DROP COLUMN IF EXISTS popular`. Popularity is derived per-request from payment counts in `lib/packagePopularity.ts:11-58`, surfaced only on the admin dashboard card.

### 7.3 `Tryout` (L121-143)

- `id Int`, `name`, `isTrial Boolean @default(false)`.
- `sortOrder Int @default(0)`.
- `durationMin Int @default(100)` — seed forces `15` for trial.
- `startDate DateTime?`, `endDate DateTime?` — status is **derived entirely from these dates** (no `isActive` column). See `lib/availability.ts:34-57`.

### 7.4 `PackageTryout` (L145-158)

Junction: `id Int`, `packageId`, `tryoutId Int` FKs (cascade), `@@unique([packageId, tryoutId])`. **No `sortOrder`** — order of tryouts in a package comes from `Tryout.sortOrder`.

### 7.5 `Question` (L161-182)

- `id Int`, `category String` (TWK/TIU/TKP from `lib/types.ts:10`).
- `question String`, `questionImage String?`, `explanation String?`, `explanationImage String?`.
- `correctAnswer Int?` — **nullable** because TKP is scored by `tkpValue`. `app/api/tryouts/[tryoutId]/questions/route.ts:54-58` requires it for non-TKP.

### 7.6 `QuestionOption` (L184-199)

`id Int`, `questionId Int` FK (cascade), `optionIndex Int`, `optionText String?`, `optionImage String?`, `tkpValue Int?`, `@@unique([questionId, optionIndex])`.

### 7.7 `TryoutQuestion` (L201-215)

Junction: `id Int`, `tryoutId`, `questionId Int` FKs (cascade), `sortOrder Int @default(0)`, `@@unique([tryoutId, questionId])`.

### 7.8 `TryoutAttempt` (L286-310)

- `id String @db.Uuid` PK, `dbgenerated("uuid_generate_v7()")`.
- `userId String @db.Text` — **stores email, not id** (FK to `users.email` on `NoAction`).
- `userName String`.
- `tryoutId Int` FK cascade.
- `twkScore`, `tiuScore`, `tkpScore`, `totalScore` Int @default(0).
- **`finishedAt DateTime?`** — set on first score-writing PUT (`app/api/tryout-attempts/[attemptId]/route.ts:188-207`). Migration: `prisma/migrations/20260614000001_add_attempt_finished_at/`.

### 7.9 `AttemptAnswer` (L312-326)

- `id String @db.Uuid` PK, `dbgenerated("uuid_generate_v7()")`.
- `attemptId String @db.Uuid` FK cascade.
- `questionIndex Int` — **index by position, not `questionId`** (relies on stable `Tryout.questions` ordering).
- `selectedOption Int @default(-1)` — `-1` = "not answered".
- **`raguRagu Boolean @default(false)`** — added in `prisma/migrations/20260614000000_add_attempt_answer_ragu_ragu/`.
- `@@unique([attemptId, questionIndex])`.

### 7.10 Feature → DB column mapping

| Feature | Schema-backed? |
| --- | --- |
| Ragu-ragu flag | ✅ `AttemptAnswer.raguRagu` |
| Autosave | ❌ No autosave-specific column. PUT body `{answers: Record<number,number>}` is the only signal. Spec mandates no `finishedAt` touch. |
| Package-closed gate | ✅ `startDate`/`endDate` on Package + Tryout. Env override `TRYOUT_DATE_PERIOD_ENABLED` (mentioned in spec, **not wired** in `app/` or `lib/`). |
| Finished-attempt list | ✅ `TryoutAttempt.finishedAt` (nullable). |
| Server rehydration | ❌ Client-only via `useAttempt` refetch on visibility/visibility-visible (`hooks/useAutosaveAnswers.ts:90-98`). No server-side "rehydration" beyond the GET. |

---

## 8. Seed Data

**Files:** `prisma/seed.ts` (203 lines), `scripts/reset-and-seed.ts` (265 lines — destructive re-seed: drops 16 tables in FK-safe order, then re-runs).

### 8.1 What the seed creates

1. **Permissions** (15) — `Permission`, `RolePermission` (full admin; user subset at L36).
2. **Packages** (4) from `data/packages.ts:5-10`: Paket Starter / Intensif / Komplit / Video Belajar. Upsert by name.
3. **Tryouts** from `data/questions.ts:81-113` (`DEFAULT_PACKAGE_BANKS`): 3 + 7 + 10 = **20 tryout rows**. Paket Video Belajar gets 0. Each tryout uses either `Q`, `QB`, or one of 14 shuffled derivations.
4. **Questions** from `data/questions-set-a.ts` + `data/questions-set-b.ts` (~110 total). Categories: TWK / TIU / TKP. `app/api/questions/route.ts:103-110` uses `q.id <= 55` as set-A boundary.
5. **Bank Accounts** from `DEFAULT_BANK_ACCOUNTS` (`data/packages.ts:12-16`).
6. Resets `questions_id_seq` and `questionOptions_id_seq` (`prisma/seed.ts:183-184`).

### 8.2 Source of truth: `data/*.ts`

DB is a cache. Static fallbacks wired:

1. `app/api/tryouts/route.ts:345, 391` — if no tryouts for `packageId`, returns `DEFAULT_PACKAGE_BANKS` raw. If none exist at all, calls `seedFromDefaults()` then returns the static if still empty. `app/api/tryouts/route.ts:143-242` is a duplicate no-auth seeder.
2. `app/api/tryouts/seed/route.ts:10-130` — `POST /api/tryouts/seed` re-imports `DEFAULT_PACKAGE_BANKS` and upserts everything.
3. `app/api/questions/route.ts:65-80` — if DB is empty, `seedDefaults()` writes `QUESTIONS` + `QUESTIONS_B`, then returns static for `?set=a|b|trial`.
4. `app/api/banks/route.ts:53-62` — same pattern with `DEFAULT_BANK_ACCOUNTS`.

**`data/soal.ts` does not exist.** Files: `data/{constants,packages,questions,questions-set-a,questions-set-b}.ts`. Legacy alias `QUESTIONS`/`QUESTIONS_B` re-exported from both `data/packages.ts:19-20` and `data/questions.ts:4-5`. `data/constants.ts` only holds `WA_NUMBER`, `TRIAL_SOAL_COUNT = 10`, `ADMIN_EMAIL`, and a hardcoded `EXPLANATIONS: Record<number,string>` map for 10 fixed IDs — **not wired to the question editor** (explanations come from `Question.explanation` column).

---

## 9. OpenSpec Specs (16 in `openspec/specs/`, all `changes/` archived)

Every spec begins with "TBD" Purpose — auto-generated from archive, Purpose never filled in.

### 9.1 `openspec/specs/tryout-answer-autosave/spec.md` (111 lines)

Six Requirement blocks:

1. **Runner autosaves answers every 60 seconds** (L6-30): PUT with full answer map; **no-reset rule** — running timer is NOT reset by subsequent answer changes; timer fires exactly once; no autosave if no answers.
2. **Force-flush on visibility/unload events** (L32-46): visibilitychange→hidden triggers immediate PUT; pagehide/beforeunload triggers `navigator.sendBeacon` PUT (fire-and-forget); component unmount triggers immediate flush.
3. **Server is source of truth on rehydration** (L48-67): on mount for in-progress attempt, local map is **replaced** from server (`answers`); on visibility hidden→visible, re-fetch and replace; pre-mount local changes are discarded. Local state remains authoritative **in-session** (no refetch as a side effect of answer select).
4. **Autosave writes only answer data** (L68-78): PUT body is exactly `{ answers: Record<number, number> }`. **MUST NOT** touch `twkScore`/`tiuScore`/`tkpScore`/`totalScore`/`raguRaguFlags`. `finishedAt` remains null.
5. **Autosave is bounded to the running phase** (L80-95): no autosave in `ready` or `result` phase (any pending timer cancelled); no new autosave in the final 5 seconds (finish path uses `useUpdateAttempt`).
6. **Multi-tab last-write-wins** (L97-110): no user-visible conflict UI; whichever tab's PUT lands second wins per question; tab B refetches and replaces its state on refocus.

### 9.2 Other tryout specs (existence summary)

| Spec | Key reqs |
| --- | --- |
| `tryout-ragu-ragu-flag/spec.md` (105L) | User toggles flag in runner; server writes `AttemptAnswer.raguRagu`; yellow border + 🚩 badge on flagged card; yellow dot on palette tile; flag is **per-attempt** (not carried over); read-only after submit; "X dari Y soal ditandai Ragu-ragu" in summary. |
| `finished-attempt-list/spec.md` (113L) | `TryoutAttempt.finishedAt` set on first score-writing PUT, preserved on subsequent PUTs, untouched on flag-only PUT. `/tryout/[attemptId]` renders `TryoutReviewMode` iff `finishedAt` non-null. List at `/tryout` shows reverse-chronological "Daftar Tryout Selesai" cards, filtered to active+owned+finished attempts. Each card has one "Lihat Pembahasan" button. |
| `tryout-attempt-availability/spec.md` (56L) | `POST /api/tryout-attempts` returns 403 `reason: "out_of_window"` (tryout inactive/scheduled/expired) or `reason: "package_closed"` (parent package not active). Centralized in `lib/availability.ts` `isAvailable(entity)`. Mentions env override `TRYOUT_DATE_PERIOD_ENABLED` (falsy → disabled) — **not yet wired** anywhere in `app/` or `lib/`. |
| `package-date-period/spec.md` (96L) | Package status derived from `startDate`/`endDate`. **No `isActive` column.** Migration `prisma/migrations/20260607000000_remove_package_is_active/` exists. |
| `tryout-date-period/spec.md` (41L) | Same date-only model for `Tryout`. Admin form has date inputs. |
| `per-tryout-question-fetch/spec.md` (56L) | `GET /api/tryouts/[tryoutId]/questions` returns `{ questions: Question[] }` with nested options. `useTryoutQuestions(tryoutId)` React Query hook with `staleTime: 5min`. |
| `tryout-page-view/spec.md` (102L) | Trial card always visible. Available packages with "Beli" → `/buy`. Owned packages with "0/N" / "N/N" progress. Best score per tryout. Mulai button creates/resumes attempt. Loading spinner. |
| `admin-question-bank-display/spec.md` (43L) | `SoalTable` MUST render every option that has `optionText | | optionImage` (image-only options are visible). Mobile list and desktop table parity. Option images MUST use `next/image` with explicit width/height. |
| `admin-settings-catalog-management/spec.md` (171L) | Database-backed package/tryout/bank CRUD with admin guard. Package delete blocked if any `Payment`/`UserPurchase` exists. Tryout delete blocked if any `TryoutAttempt` exists. `PackageTryout` replacement is atomic and updates `tryoutCount`. `BankAccount` soft-delete via `deletedAt`. Tryouts are **shared entities across packages** (edits sync). Trial tryout in a paid package shows a "Trial" indicator. |
| `user-package-catalog/spec.md` (52L) | Soft-deleted packages hidden from user pages. Active paid packages visible regardless of `isTrial`. "Dimiliki" indicator on owned packages (no truncation). Payment submission uses DB package id. |

**No spec exists for:** package "popular" flag, popularity card mentioned only in archive `2026-06-13-add-admin-package-popularity-card/` (resolved). No spec for `useTryoutsWithQuestions` hook or for reordering `TryoutQuestion` rows from the admin UI.

---

## 10. Cross-Cutting Findings (ranked by impact)

### 🔴 10.1 — sendBeacon is broken

`hooks/useAutosaveAnswers.ts:99-105` builds `Blob({type: 'application/json'})` but browsers strip that Content-Type for beacon transport → server's `request.json()` at `app/api/tryout-attempts/[attemptId]/route.ts:149` throws. **The autosave spec mandates this path** (`openspec/specs/tryout-answer-autosave/spec.md:38-43`); spec is not met by current code. Tests mock `sendBeacon` directly so the bug is invisible in CI. Last-second answers on tab close are lost.

**Fix shape:** change Content-Type to `text/plain;charset=UTF-8` and have the server accept that with manual JSON parse, OR replace `sendBeacon` with `fetch(..., {keepalive: true})` which honors Content-Type and is supported by modern browsers. Update the spec to match the chosen approach.

### 🔴 10.2 — Two unauthenticated `correctAnswer` leaks

1. `GET /api/tryouts/[tryoutId]/questions` (`app/api/tryouts/[tryoutId]/questions/route.ts:104-152`) — no auth. `mapQuestion` (L88) returns `correctAnswer` straight from the DB.
2. `GET /api/tryouts?include=questions` (`app/api/tryouts/route.ts`) — no auth on GET. When `include=questions` query param is passed, `buildFullResponse`/`mapQuestion` (L49, L103-107) includes `correctAnswer`. Default light path is safe.

Both should require `requireActiveSession` (or `requireAdmin` for the admin soal page). One-line guard per route.

### 🔴 10.3 — Unauthenticated read of any user's attempt history

`GET /api/tryout-attempts?userId=…` (`app/api/tryout-attempts/route.ts:16-37`) — no auth, lets anyone enumerate any user's attempt history by email-shaped userId. Add `requireActiveSession` + ownership check that `userId === session.user.email`.

### 🟠 10.4 — No autosave UI feedback

No "Saved" badge, no toast, no spinner on Finish. Spec is silent. UX gap. Easy fix: drive a small indicator from `useUpdateAttemptAnswers.mutate`'s `onSuccess` / `onError` callbacks (which exist on TanStack Query mutations).

### 🟠 10.5 — No client-side handling of 401 from autosave

`useUpdateAttemptAnswers` returns the error; `useAutosaveAnswers` doesn't surface it. On stale session, the user keeps answering in-memory but nothing persists. Next `useAttempt` refetch shows generic "Tryout Tidak Ditemukan" instead of "Sesi berakhir di perangkat lain". Easy fix: hook `onError` to invalidate `['attempt', id]` and surface the stale-session message.

### 🟠 10.6 — Timer is not paused when tab is hidden

`useAutosaveAnswers.ts:91-98` flushes answers + invalidates the query but doesn't tell the engine to pause its `setInterval`. Hiding the tab for 10 min loses 10 min of countdown. Fix: have the visibility listener call a `pauseTimer()` ref exposed by the engine.

### 🟠 10.7 — Trial banner hard-codes "10 Soal · 15 menit"

`TryoutEngine.tsx:419` — string is hard-coded regardless of actual `durationMin` / `questions.length`. Trial tryouts with non-15-min durations display wrong info.

### 🟠 10.8 — `formatTime` only emits `MM:SS`

`lib/scoring.ts:23-27`. Engine renders `HH:MM:SS` by string-splitting at `TryoutEngine.tsx:412`. For tryouts > 99 min the timer rolls over incorrectly. Fix: extend `formatTime` to accept a width arg, or write a separate `formatTimeHours` helper.

### 🟡 10.9 — Scoring runs twice

`TryoutEngine.tsx:243-247` (live totals) and `app/(user)/tryout/[attemptId]/page.tsx:107` (final PUT-bound totals) both call `calculateScoring`. Same helpers, two sources of truth invites drift. Consider extracting to a single `useScores()` hook.

### 🟡 10.10 — Two pembahasan components duplicate logic

`TryoutReviewMode.tsx` and `PembahasanNavigator.tsx` render the same review UI with separate correctness-color rules (`TryoutReviewMode.tsx:30-38` vs `PembahasanNavigator.tsx:30-33`). Extract a shared `<QuestionStatusBadge>` and `<OptionLabel>` helper.

### 🟡 10.11 — `shouldRehydrate` ref is set but never read

`useAutosaveAnswers.ts:96` flips `shouldRehydrateRef.current = true` on visibility-visible, but `TryoutEngine.tsx:196-205` rehydration effect keys off `preloadedAnswers` change alone. Works by accident because `useAttempt` refetch drives `preloadedAnswers`. Dead code path.

### 🟡 10.12 — `POST /api/tryout-attempts` (legacy) is dead code

Duplicate of `/resume`. Runner uses `/resume` exclusively. Worth deleting or `requireActiveSession`-guarding. No caller found in app code.

### 🟡 10.13 — No `TryoutQuestion` reorder UI

POST appends at end, PUT doesn't move. Admin can only delete. Spec doesn't require reorder but the lack is visible in `admin-settings-catalog-management` ops.

### 🟡 10.14 — `TRYOUT_DATE_PERIOD_ENABLED` env override not wired

Specified in `tryout-attempt-availability/spec.md:43` but **not** referenced anywhere in `app/` or `lib/`. Wire it in `lib/availability.ts:isAvailable()`.

### 🟡 10.15 — `app/admin/layout.tsx:35` `deletedAt` filter bug

Documented in `context.md:62-76` — server-side `prisma.package.findMany()` is missing `where: { deletedAt: null }` filter (vs `app/api/packages/route.ts:27-31` which has it). One-line fix; contradicts `admin-settings-catalog-management` spec.

### 🟡 10.16 — `Post /api/tryouts/seed` has no auth

`app/api/tryouts/seed/route.ts:10` — anyone can re-seed. Currently no caller, but exposed.

### 🟡 10.17 — `POST/PUT/DELETE /api/questions` has no `requireAdmin`

`app/api/questions/route.ts:127-317` — legacy global question endpoint, superseded by per-tryout routes, still callable by anyone. Not used by the admin soal page (which talks to per-tryout routes).

### 🟢 10.18 — `useAppStore` still imports `@/data/questions`

Legacy static-data import coexists with new DB-backed APIs. Worth pruning when refactoring.

### 🟢 10.19 — `QuestionInput` / `TryoutInput` in `data/questions.ts`

Used only by seed scripts (`prisma/seed.ts`); live types live in `lib/types.ts`.

---

## 11. Recent Commits on Staging

From `git log --oneline -n 20 -- app/(user)/tryout hooks/useAutosaveAnswers.ts hooks/useTryoutQueries.ts app/api/tryout-attempts components/tryout`, the 5 most recent tryout-relevant:

| SHA | Date | Title | Files touched |
| --- | --- | --- | --- |
| `4cf4258` | 2026-06-14 | **feat(tryout): autosave answers every 60s with server rehydration** | `useAutosaveAnswers.ts` (new, 125 lines), `useTryoutQueries.ts` (+17), `TryoutEngine.tsx` (+33), `[attemptId]/route.ts` (+13), `resume/route.ts` (+5), spec `openspec/specs/tryout-answer-autosave/spec.md` (new, 111 lines) |
| `ba5d669` | 2026-06-14 | **feat(tryout): add finished attempts list with review shortcut** | `app/(user)/tryout/page.tsx` (+87), `FinishedAttemptCard.tsx` (new, 65 lines), `[attemptId]/route.ts` (+14), `useTryoutQueries.ts` (+2), `lib/types.ts` (+1), `prisma/schema.prisma` (+9 `finishedAt` column), spec `openspec/specs/finished-attempt-list/spec.md` |
| `0e04cd1` | 2026-06-14 | **feat(tryout): add Ragu-ragu flag + fix package-closed gate** | `TryoutEngine.tsx` (+83), `TryoutReviewMode.tsx` (+46), `[attemptId]/route.ts` (+23), `resume/route.ts` (+30), `useTryoutQueries.ts` (+74), `lib/types.ts` (+8), `prisma/schema.prisma` (+7 `raguRagu` column), spec `openspec/specs/tryout-ragu-ragu-flag/spec.md` |
| `5bfbcde` | (theme) | feat(theme): add brand color palette editor | minor touches in `[attemptId]/page.tsx` and `TryoutEngine.tsx` (2 and 12 line diffs) |
| `f1b7338` | (refactor) | restructure dashboard under (user) route group, add per-tryout question fetch | `app/(user)/tryout/[attemptId]/page.tsx` (new, 119 lines — the file itself) |

### Per-commit detail

**`0e04cd1` — Ragu-ragu flag + package-closed fix:**

- New `AttemptAnswer.raguRagu: Boolean @default(false)` column.
- `useUpdateAttemptFlags` hook (immediate PUT) with optimistic update + rollback.
- `queueFlagUpdate` module-level debouncer (250ms) for in-session flag toggles.
- Engine: yellow card border, badge, "Tandai Ragu-ragu" button, grid dot.
- `TryoutReviewMode`: "X dari Y soal ditandai Ragu-ragu" banner + per-question pill + grid dots.
- PUT `/api/tryout-attempts/[id]` extended to accept `raguRaguFlags` (upsert, non-destructive).
- **Resume fix:** `isPackageAvailable` only checks the package the user paid through, not all linked packages. Regression test added.

**`ba5d669` — Finished attempts list:**

- New `TryoutAttempt.finishedAt: DateTime?` column (replaces `totalScore > 0` heuristic).
- New `FinishedAttemptCard` component, list rendered at bottom of `/tryout`.
- `useAttemptHistory` hook wired up.
- Server stamps `finishedAt = new Date()` on first score-writing PUT.
- Tryout-attempt GET returns `finishedAt`.

**`4cf4258` — Autosave:**

- `useAutosaveAnswers` hook (new) with 60s no-reset cadence.
- `useUpdateAttemptAnswers` hook (fire-and-forget mutation) — separate from `useUpdateAttempt` (which writes scores + finishedAt).
- Engine: `tryScheduleAutosave()` on every answer click, `flushAnswers()` on visibility-hidden, `sendBeacon` on `pagehide`/`beforeunload`. Server rehydrates on visibility-visible by invalidating `['attempt', id]`.
- Resume fix: uses `finishedAt` (not `totalScore`) to detect in-progress attempts.
- PUT distinguishes autosave `{answers}` from score-write `{twkScore, tiuScore, tkpScore, totalScore}`: only the latter stamps `finishedAt`.
- `openspec/specs/tryout-answer-autosave/spec.md` written with 6 requirements, 17 scenarios.

### Cross-cutting questions raised by these commits

- The autosave spec mandates `sendBeacon` (scenario "Tab close triggers sendBeacon flush", L38-43) — but the implementation has the Content-Type bug (§10.1). Spec is not met by current code.
- The spec also mandates "Server is source of truth on rehydration" — code does invalidate on visibility-visible, but `shouldRehydrate` ref is set and not consumed by the engine's rehydration effect, so the spec is met by accident (the `useAttempt` refetch alone drives rehydration).
- The three specs (`tryout-answer-autosave`, `finished-attempt-list`, `tryout-ragu-ragu-flag`) all live in `openspec/specs/`.

---

## 12. File Inventory (verified present at scout time)

| Area | Files |
| --- | --- |
| Pages | `app/(user)/tryout/page.tsx`, `app/(user)/tryout/[attemptId]/{page,loading,error}.tsx`, `app/(user)/tryout/{loading,error}.tsx` |
| Components | `components/tryout/{TryoutEngine,PembahasanNavigator,TryoutReviewMode,FinishedAttemptCard}.tsx` (+ test files) |
| Hooks | `hooks/{useTryoutQueries,useAutosaveAnswers}.ts` (+ test files) |
| APIs | `app/api/tryout-attempts/route.ts`, `app/api/tryout-attempts/[attemptId]/route.ts`, `app/api/tryout-attempts/resume/route.ts`, `app/api/tryouts/route.ts`, `app/api/tryouts/[tryoutId]/route.ts`, `app/api/tryouts/[tryoutId]/questions/route.ts`, `app/api/tryouts/[tryoutId]/questions/[questionId]/route.ts`, `app/api/tryouts/seed/route.ts`, `app/api/packages/[packageId]/tryouts/route.ts` (+ test files) |
| Lib | `lib/scoring.ts`, `lib/routeAuth.ts`, `lib/deviceSession.ts`, `lib/adminAuth.ts`, `lib/availability.ts` (+ test files) |
| Schema | `prisma/schema.prisma` (models `Tryout`, `TryoutQuestion`, `Question`, `QuestionOption`, `TryoutAttempt`, `AttemptAnswer`) |
| Spec | `openspec/specs/tryout-answer-autosave/spec.md` (and 14 sibling specs) |

---

## 13. Top Fix Candidates (priority order)

If you're picking work for a future session, the ranked list:

1. **🔴 Auth coverage:** add `requireActiveSession` to `GET /api/tryout-attempts`, `GET /api/tryouts/[id]/questions`, and `GET /api/tryouts` (when `include=questions`). Closes two `correctAnswer` leaks + the user-history enumeration. ~3 one-line guards.
2. **🔴 sendBeacon fix:** replace `navigator.sendBeacon(Blob({type:'application/json'}))` with `fetch(..., {keepalive: true})` in `hooks/useAutosaveAnswers.ts:99-105`. Update spec to match. Update test to cover the real fetch pipeline.
3. **🟠 Autosave indicator:** add a small "Tersimpan" badge in the runner header driven by `useUpdateAttemptAnswers.mutate`'s `onSuccess`/`onError`. Couple it with a stale-session error surface.
4. **🟠 Timer pause on tab hidden:** add a `pauseTimer()` ref exposed by `TryoutEngine`; call it from the `visibilitychange` listener in `useAutosaveAnswers.ts`.
5. **🟡 Wire `TRYOUT_DATE_PERIOD_ENABLED`** in `lib/availability.ts:isAvailable()` per `tryout-attempt-availability/spec.md:43`.
6. **🟡 Trial banner** replace hard-coded "10 Soal · 15 menit" with `tryout.questions.length` + `durationMin`.
7. **🟡 `formatTime`** extend to support hours properly; replace string-split at `TryoutEngine.tsx:412`.
8. **🟢 Lockdown:** delete or guard `POST /api/tryout-attempts` (dead code).
9. **🟢 One-liner:** `app/admin/layout.tsx:35` missing `where: { deletedAt: null }` per `context.md`.
10. **🟢 `TryoutQuestion` reorder UI** for admin soal page (spec gap).
11. **🟢 Extract shared pembahasan components** between `TryoutReviewMode` and `PembahasanNavigator`.
12. **🟢 Extract `useScores()` hook** to collapse the two scoring paths.
