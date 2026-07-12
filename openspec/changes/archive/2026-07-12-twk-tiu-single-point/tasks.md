## 1. Update scoring source of truth

- [x] 1.1 In `lib/scoring.ts:9`, change the `5` literal to `1` in `getScore()` so a correct TWK or TIU answer returns 1 point. Leave the TKP branch and the return-0 paths unchanged.

## 2. Update scoring tests

- [x] 2.1 In `lib/scoring.test.ts`, update the test `returns 5 when TWK answer is correct` to expect `1` and rename it to `returns 1 when TWK answer is correct`.
- [x] 2.2 In `lib/scoring.test.ts`, update the test `returns 5 when TIU answer is correct` to expect `1` and rename it to `returns 1 when TIU answer is correct`.
- [x] 2.3 In `lib/scoring.test.ts`, update `correctly scores TWK questions` to expect `TWK: 1, total: 1`.
- [x] 2.4 In `lib/scoring.test.ts`, update `correctly scores TIU questions` to expect `TIU: 1, total: 1`.
- [x] 2.5 In `lib/scoring.test.ts`, update `accumulates scores across categories` to expect `{ TWK: 1, TIU: 1, TKP: 5, total: 7 }` (TWK 1 + TIU 1 + TKP 5).

## 3. Update result-phase UI in TryoutEngine

- [x] 3.1 In `components/tryout/TryoutEngine.tsx:483`, update the hardcoded header string from `Nilai Ambang Batas SKD: 298 (TWK≥65, TIU≥80, TKP≥166)` to `Nilai Ambang Batas SKD: 195 (TWK≥13, TIU≥16, TKP≥166)`.
- [x] 3.2 In `components/tryout/TryoutEngine.tsx:487-488`, update the `pass` values in the threshold array: TWK `pass: 65` → `pass: 13`, TIU `pass: 80` → `pass: 16`. Leave TKP `pass: 166` unchanged.
- [x] 3.3 In `components/tryout/TryoutEngine.tsx:497`, update the per-card label so it appends the `soal` unit: render `Ambang: {pass} soal` instead of `Ambang: {pass}`. Confirm TWK reads `Ambang: 13 soal`, TIU reads `Ambang: 16 soal`, and TKP (if its label is shown) still reads `Ambang: 166` (no `soal` suffix — TKP is a sum-of-weighted-options, not a question count).
- [x] 3.4 In `components/tryout/TryoutEngine.tsx`, find the celebratory-emoji gate (currently `totalScore >= 298 ? "🎉" : "💪"` near the result-phase card) and update the threshold from `298` to `195` so the emoji fires at the new total passing boundary.

## 4. Update documentation

- [x] 4.1 In `TRYOUTS.md:326`, update the TWK & TIU scoring rule text from "correct = 5 points" to "correct = 1 point". Leave the no-negative-scoring line and the TKP line unchanged.

## 5. Verify

- [x] 5.1 Run `npm run test` and confirm the updated `lib/scoring.test.ts` cases pass and no other test regresses.
- [x] 5.2 Run `npm run lint` and confirm no new warnings.
- [x] 5.3 Run `npm run build` and confirm a clean compile.
- [x] 5.4 Manual smoke: start a TWK-heavy attempt, finish, and confirm the result card shows `TWK: N` with `N <= 30`, the per-card label `Ambang: 13 soal`, and the header `Nilai Ambang Batas SKD: 195 (TWK≥13, TIU≥16, TKP≥166)`.
