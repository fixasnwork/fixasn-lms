"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import type { Question } from "@/lib/types";
import { getScore, formatTime } from "@/lib/scoring";
import { Logo, Button, Badge, Card, Modal } from "@/components/ui";
import {
  useLogoConfig,
  useUpdateAttemptFlags,
  useUpdateAttemptAnswers,
  queueFlagUpdate,
} from "@/hooks/useTryoutQueries";
import { useAutosaveAnswers } from "@/hooks/useAutosaveAnswers";
import { useNavGuardStore } from "@/store/useNavGuardStore";
import PembahasanNavigator from "./PembahasanNavigator";

// ── Types ──
interface Section {
  label: string;
  indices: number[];
  color: string;
  bg: string;
}

// ── External QuestionGrid component (prevents scroll-reset on re-render) ──
interface QuestionGridProps {
  sections: Section[];
  answered: number;
  totalQuestions: number;
  answers: Record<number, number>;
  raguRagu: Record<number, boolean>;
  cur: number;
  onSelect: (index: number) => void;
  variant?: "sidebar" | "modal";
}

function QuestionGrid({
  sections,
  answered,
  totalQuestions,
  answers,
  raguRagu,
  cur,
  onSelect,
  variant = "sidebar",
}: QuestionGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <p className="font-extrabold text-xs text-brand mb-2">
        📊 {answered}/{totalQuestions} dijawab
      </p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-brand to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${(answered / totalQuestions) * 100}%` }}
        />
      </div>

      <div
        ref={scrollRef}
        className={
          variant === "sidebar"
            ? "max-h-[calc(100vh-220px)] overflow-y-auto overscroll-contain"
            : "max-h-[60vh] overflow-y-auto overscroll-contain"
        }
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 transparent",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {sections.map((sec) => {
          const done = sec.indices.filter(
            (i) => answers[i] !== undefined,
          ).length;
          return (
            <div key={sec.label} className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span
                  className="font-bold text-xs"
                  style={{ color: sec.color }}
                >
                  {sec.label}
                </span>
                <span className="text-xs text-gray-400">
                  {done}/{sec.indices.length}
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1.5">
                {sec.indices.map((gi) => {
                  const isActive = gi === cur;
                  const isDone = answers[gi] !== undefined;
                  const isFlagged = !!raguRagu[gi];
                  return (
                    <button
                      key={gi}
                      onClick={() => onSelect(gi)}
                      aria-label={
                        isFlagged
                          ? `Soal ${gi + 1}, ditandai Ragu-ragu${isDone ? ", sudah dijawab" : ""}`
                          : `Soal ${gi + 1}${isDone ? ", sudah dijawab" : ""}`
                      }
                      className={`
                        relative w-full aspect-square rounded-md border-none cursor-pointer font-semibold text-xs transition-all
                        ${isActive ? "ring-2 ring-offset-1" : ""}
                      `}
                      style={{
                        background: isActive
                          ? sec.color
                          : isDone
                            ? sec.bg
                            : "#F1F5F9",
                        color: isActive
                          ? "#fff"
                          : isDone
                            ? sec.color
                            : "#9CA3AF",
                        outline: isActive ? `2px solid ${sec.color}` : "none",
                        outlineOffset: 1,
                      }}
                    >
                      {gi + 1}
                      {isFlagged && (
                        <span
                          aria-hidden="true"
                          className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-yellow-400 ring-1 ring-white"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
        {[
          { color: "#2563EB", label: "Soal aktif" },
          { color: "#DBEAFE", label: "Sudah dijawab" },
          { color: "#F1F5F9", label: "Belum dijawab" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex gap-1.5 items-center text-xs text-gray-500"
          >
            <div
              className="w-3 h-3 rounded border border-gray-200 flex-shrink-0"
              style={{ background: item.color }}
            />
            {item.label}
          </div>
        ))}
        <div className="flex gap-1.5 items-center text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
          Ragu-ragu
        </div>
      </div>
    </>
  );
}

// ── Main Component ──
interface TryoutEngineProps {
  attemptId?: string;
  questions: Question[];
  durationMin: number;
  setName?: string;
  isTrial?: boolean;
  onFinish?: (answers: Record<number, number>) => void;
  onBack?: () => void;
  preloadedAnswers?: Record<number, number>;
  preloadedRaguRagu?: Record<number, boolean>;
  /**
   * Remaining timer seconds from the server on resume. When provided AND
   * `preloadedAnswers` is non-empty (i.e. this is a resume, not a fresh
   * attempt), the engine seeds `timeLeft` from this value instead of the
   * full `durationMin * 60`. Falls back to `null`/undefined for fresh
   * attempts so the countdown always starts from the full duration.
   */
  initialTimeLeftSeconds?: number | null;
  /**
   * Called when the user confirms a "Simpan & Keluar" save-and-exit action
   * after the PUT succeeds. Page-level wiring typically routes the user
   * back to `/tryout`. Not called on cancel or on error.
   */
  onExit?: () => void;
}

export default function TryoutEngine({
  attemptId,
  questions,
  durationMin,
  setName = "Tryout SKD",
  isTrial = false,
  onFinish,
  onBack,
  preloadedAnswers = {},
  preloadedRaguRagu = {},
  initialTimeLeftSeconds,
  onExit,
}: TryoutEngineProps) {
  const { data: logoConfig } = useLogoConfig();
  const updateFlags = useUpdateAttemptFlags(attemptId ?? "");
  const updateAnswers = useUpdateAttemptAnswers(attemptId ?? "");
  const DURATION = (durationMin || 100) * 60;

  const [answers, setAnswers] =
    useState<Record<number, number>>(preloadedAnswers);
  const [raguRagu, setRaguRagu] =
    useState<Record<number, boolean>>(preloadedRaguRagu);
  const [cur, setCur] = useState(0);
  // Lazy initializer: when this is a resume (preloadedAnswers non-empty AND
  // the server returned a saved timer), seed the countdown from the server.
  // Otherwise start at the full duration. Runs exactly once on mount — later
  // server refetches must NOT reset the live timer.
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (
      initialTimeLeftSeconds !== undefined &&
      initialTimeLeftSeconds !== null &&
      Object.keys(preloadedAnswers).length > 0
    ) {
      return Math.max(0, Math.min(DURATION, initialTimeLeftSeconds));
    }
    return DURATION;
  });
  const [phase, setPhase] = useState<"ready" | "running" | "result">("ready");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldRehydrate = useRef(false);
  const prevPreloaded = useRef(preloadedAnswers);

  // ── Autosave hook (60s cadence, lifecycle flush, rehydration) ──
  const { tryScheduleAutosave, syncAnswers } = useAutosaveAnswers({
    attemptId,
    phase,
    timeLeft,
    shouldRehydrateRef: shouldRehydrate,
  });
  // Sync ref on every render so the hook reads latest answers.
  syncAnswers(answers);

  // Rehydrate from server when preloadedAnswers changes (e.g. after invalidation)
  useEffect(() => {
    const prev = prevPreloaded.current;
    const isDifferent =
      Object.keys(prev).length !== Object.keys(preloadedAnswers).length ||
      Object.entries(preloadedAnswers).some(([k, v]) => prev[Number(k)] !== v);
    if (isDifferent) {
      setAnswers(preloadedAnswers);
    }
    prevPreloaded.current = preloadedAnswers;
  }, [preloadedAnswers]);

  // ── Nav guard: keep a ref to the latest save closure. The store's
  // `save` slot points at this ref so the sidebar/bottom-nav always read
  // the freshest `answers` / `timeLeft` / `raguRagu` without forcing the
  // store to update on every keystroke. ──
  const performSaveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    performSaveRef.current = async () => {
      if (!attemptId) return;
      await Promise.all([
        updateAnswers.mutateAsync({
          answers,
          timeLeftSeconds: timeLeft,
        }),
        // Skip if no flags were ever touched — mutateAsync on an empty
        // body is a no-op on the server.
        ...(Object.keys(raguRagu).length > 0
          ? [updateFlags.mutateAsync(raguRagu)]
          : []),
      ]);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  });

  // ── Nav guard: register/unregister + push progress snapshot. Active
  // only while a tryout is actually running (not in ready/result phases). ──
  const isRunning = phase === "running" && !!attemptId;
  useEffect(() => {
    useNavGuardStore.getState().setActive(isRunning);
    if (!isRunning) {
      useNavGuardStore.getState().setSave(null);
      useNavGuardStore.getState().setProgress(null);
    } else {
      // Bind a stable wrapper that always delegates to the latest ref.
      useNavGuardStore.getState().setSave(() => performSaveRef.current());
    }
    return () => {
      useNavGuardStore.getState().reset();
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    useNavGuardStore.getState().setProgress({
      answered: Object.keys(answers).length,
      total: questions.length,
      timeLeftLabel: formatTime(timeLeft),
    });
  }, [isRunning, answers, timeLeft, questions.length]);

  const toggleRaguRagu = useCallback(
    (index: number) => {
      setRaguRagu((prev) => {
        const next = { ...prev, [index]: !prev[index] };
        if (attemptId) queueFlagUpdate(attemptId, { [index]: next[index] });
        return next;
      });
    },
    [attemptId],
  );

  const startTryout = useCallback(() => {
    setPhase("running");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("result");
          if (attemptId) updateFlags.mutate(raguRagu);
          onFinish?.(answers);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [answers, onFinish, attemptId, raguRagu, updateFlags]);

  const finish = useCallback(async () => {
    clearInterval(timerRef.current!);
    if (attemptId) await updateFlags.mutateAsync(raguRagu);
    await onFinish?.(answers);
    setPhase("result");
  }, [answers, onFinish, attemptId, raguRagu, updateFlags]);

  // ── Save-and-exit (Simpan & Keluar) ──
  // Delegates the actual PUT to the ref so the nav-guard modal and this
  // modal share a single code path. On success: close the modal, call
  // onExit?. On error: keep the modal open and surface a small inline
  // message so the user can retry.
  const handleConfirmExit = useCallback(async () => {
    setExitError(null);
    try {
      await performSaveRef.current();
      setShowExitConfirm(false);
      onExit?.();
    } catch (err) {
      setExitError(
        err instanceof Error ? err.message : "Gagal menyimpan, coba lagi.",
      );
    }
  }, [onExit]);

  // Scoring
  const totals = { TWK: 0, TIU: 0, TKP: 0 };
  questions.forEach((q, i) => {
    totals[q.category] += getScore(q, answers[i]);
  });
  const totalScore = totals.TWK + totals.TIU + totals.TKP;

  const retry = () => {
    setAnswers({});
    setCur(0);
    setTimeLeft(DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ready");
  };

  const handleSelectQuestion = useCallback((index: number) => {
    setCur(index);
    setShowMobileNav(false);
  }, []);

  // ── PHASE: READY ──
  if (phase === "ready") {
    const durMenit = Math.round(DURATION / 60);
    const tips = [
      { icon: "📝", label: "Sediakan kertas coretan" },
      { icon: "🔇", label: "Cari tempat yang tenang" },
      { icon: "🤝", label: "Kerjakan dengan jujur" },
      { icon: "📶", label: "Pastikan koneksi stabil" },
      { icon: "🔋", label: "Baterai cukup" },
      { icon: "🚫", label: "Jangan keluar / pindah tab" },
    ];

    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-xl w-full p-6 sm:p-8 lg:p-10 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-brand to-brand-secondary flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-4 sm:mb-5">
            📋
          </div>
          <h2 className="font-black text-xl sm:text-2xl text-brand mb-1 sm:mb-1.5">
            {setName}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-2 sm:mb-3">
            {isTrial
              ? "Trial · 10 soal · 15 menit"
              : `110 soal · ${durMenit} menit · TWK + TIU + TKP`}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 mb-4 sm:mb-6 inline-block">
            <span className="font-bold text-amber-800 text-xs sm:text-sm">
              ⏱ Ujian berlangsung selama{" "}
              <strong className="text-amber-900">{durMenit} menit</strong>
              .&nbsp; Pastikan kamu siap!
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {tips.map((t, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 sm:gap-2"
              >
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-brand flex items-center justify-center text-xl sm:text-2xl">
                  {t.icon}
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-gray-700 text-center leading-tight">
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={onBack}>
              Batalkan
            </Button>
            <Button
              variant="primary"
              className="flex-[2]"
              onClick={startTryout}
            >
              Mulai Tryout
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── PHASE: RESULT ──
  if (phase === "result") {
    return (
      <div className="min-h-screen bg-[#F8FAFF] p-3 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-5">
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto"
            >
              ← Kembali ke Dashboard
            </Button>
            <Button
              variant="primary"
              onClick={retry}
              className="w-full sm:w-auto sm:ml-auto"
            >
              🔄 Ulangi Tryout
            </Button>
          </div>

          <Card className="bg-gradient-to-br from-brand-dark to-brand-secondary text-white text-center p-5 sm:p-8 mb-5 sm:mb-6">
            <div className="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3">
              {totalScore >= 195 ? "🎉" : "💪"}
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black mb-1">
              Hasil {setName}
            </h2>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-yellow-400 leading-none my-2 sm:my-3">
              {totalScore}
            </div>
            <div className="text-white/70 text-xs sm:text-sm mt-1">
              Total Skor · Nilai Ambang Batas SKD: 195 (TWK≥13, TIU≥16, TKP≥166)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
              {[
                { cat: "TWK", col: "#60A5FA", pass: 13 },
                { cat: "TIU", col: "#A78BFA", pass: 16 },
                { cat: "TKP", col: "#FCD34D", pass: 166 },
              ].map(({ cat, col, pass }) => (
                <div key={cat} className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <div className="font-bold text-xs sm:text-sm mb-1">{cat}</div>
                  <div
                    className="text-2xl sm:text-3xl font-black"
                    style={{ color: col }}
                  >
                    {totals[cat as keyof typeof totals]}
                  </div>
                  <div className="text-white/60 text-[10px] sm:text-xs mt-1">
                    Ambang: {pass}
                    {cat === "TKP" ? "" : " soal"} &nbsp;{" "}
                    {totals[cat as keyof typeof totals] >= pass ? "✅" : "❌"}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <PembahasanNavigator
            questions={questions}
            answers={answers}
            name={setName}
            onBack={onBack}
            onRetry={retry}
          />
        </div>
      </div>
    );
  }

  // ── PHASE: RUNNING ──
  const q = questions[cur];
  const answered = Object.keys(answers).length;

  const categoryIndices: Record<string, number[]> = {
    TWK: [],
    TIU: [],
    TKP: [],
  };
  questions.forEach((question, i) => {
    if (categoryIndices[question.category]) {
      categoryIndices[question.category].push(i);
    }
  });

  const twkDone = categoryIndices.TWK.filter(
    (i) => answers[i] !== undefined,
  ).length;
  const tiuDone = categoryIndices.TIU.filter(
    (i) => answers[i] !== undefined,
  ).length;
  const tkpDone = categoryIndices.TKP.filter(
    (i) => answers[i] !== undefined,
  ).length;

  const sections: Section[] = [
    {
      label: "TWK",
      indices: categoryIndices.TWK,
      color: "#2563EB",
      bg: "#DBEAFE",
    },
    {
      label: "TIU",
      indices: categoryIndices.TIU,
      color: "#7C3AED",
      bg: "#EDE9FE",
    },
    {
      label: "TKP",
      indices: categoryIndices.TKP,
      color: "#D97706",
      bg: "#FEF3C7",
    },
  ];

  const currentSection =
    sections.find((s) => s.indices.includes(cur)) || sections[0];

  const timeStr = formatTime(timeLeft);
  const timerShort = timeStr.split(":").slice(-2).join(":"); // MM:SS for mobile

  return (
    <div className="min-h-screen bg-[#F8FAFF] w-full max-w-[100vw] overflow-x-hidden">
      {/* ── Sticky Header ── */}
      <div
        className="bg-white border-b border-gray-100 px-3 sm:px-4 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Logo */}
        <div className="flex-shrink-0">
          <Logo size="sm" cfg={logoConfig} />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop stats */}
          <div className="hidden md:flex gap-3 text-xs text-gray-400 font-semibold">
            <span>
              TWK: {twkDone}/{categoryIndices.TWK.length}
            </span>
            <span>
              TIU: {tiuDone}/{categoryIndices.TIU.length}
            </span>
            <span>
              TKP: {tkpDone}/{categoryIndices.TKP.length}
            </span>
          </div>

          {/* Timer — full on desktop, short (MM:SS) on mobile */}
          <div
            className={`px-2 sm:px-3 py-1 rounded-full font-black text-center flex-shrink-0 ${
              timeLeft < 300
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-700"
            } text-xs sm:text-sm md:text-lg min-w-[52px] sm:min-w-[64px] md:min-w-[80px]`}
          >
            ⏱ <span className="hidden sm:inline">{timeStr}</span>
            <span className="sm:hidden">{timerShort}</span>
          </div>

          {/* Simpan & Keluar — running phase only, opens the confirmation modal. */}
          {attemptId && (
            <Button
              variant="outline"
              size="sm"
              data-testid="simpan-keluar-button"
              onClick={() => setShowExitConfirm(true)}
              disabled={updateAnswers.isPending}
              className="!px-2 sm:!px-3 hidden sm:inline-flex"
            >
              💾 Simpan & Keluar
            </Button>
          )}

          {/* Finish */}
          <Button
            variant="danger"
            size="sm"
            onClick={finish}
            className="!px-2 sm:!px-3"
          >
            <span className="hidden sm:inline">Selesai</span>
            <span className="sm:hidden">✓</span>
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 sm:gap-5 pb-24 lg:pb-4">
        {/* Question Card */}
        <div>
          <Card
            className={`p-4 sm:p-6 transition-colors ${
              raguRagu[cur]
                ? "border-2 border-yellow-400 bg-yellow-50/40 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]"
                : ""
            }`}
          >
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              <Badge
                color={
                  q.category === "TWK"
                    ? "blue"
                    : q.category === "TIU"
                      ? "purple"
                      : "yellow"
                }
              >
                {q.category}
              </Badge>
              <span className="text-xs sm:text-sm text-gray-400 font-semibold">
                Soal {cur + 1} / {questions.length}
              </span>
              {raguRagu[cur] && (
                <span
                  data-testid="ragu-ragu-badge"
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-yellow-800 bg-yellow-200/80 px-2 py-0.5 rounded-md"
                >
                  <span aria-hidden="true">🚩</span> Ragu-ragu
                </span>
              )}
              {q.category === "TKP" && (
                <span className="text-[10px] sm:text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md ml-auto">
                  Pilih yang paling mencerminkan dirimu
                </span>
              )}
            </div>

            {/* Question text */}
            <p className="font-bold text-sm sm:text-base text-gray-800 mb-3 leading-relaxed">
              {q.question}
            </p>
            {q.questionImage && (
              <div className="relative w-full h-36 sm:h-48 mb-4">
                <Image
                  src={q.questionImage}
                  alt="soal"
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="rounded-lg border border-gray-200 object-contain bg-white"
                />
              </div>
            )}

            {/* Options */}
            <div className="flex flex-col gap-2 sm:gap-2.5">
              {q.options.map((opt, j) => {
                const optImg = opt.optionImage;
                const isSelected = answers[cur] === j;
                return (
                  <button
                    key={j}
                    onClick={() => {
                      setAnswers({ ...answers, [cur]: j });
                      tryScheduleAutosave();
                    }}
                    className={`p-2.5 sm:p-3.5 border-2 rounded-xl text-left cursor-pointer font-medium text-xs sm:text-sm transition-all flex items-center gap-2 sm:gap-3 ${
                      isSelected
                        ? q.category === "TWK"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : q.category === "TIU"
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {String.fromCharCode(65 + j)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {opt.optionText && (
                        <span className="leading-relaxed">
                          {opt.optionText}
                        </span>
                      )}
                      {optImg && (
                        <div className="relative w-full h-16 sm:h-24 mt-1">
                          <Image
                            src={optImg}
                            alt={`Opsi ${String.fromCharCode(65 + j)}`}
                            fill
                            sizes="(max-width: 640px) 100vw, 600px"
                            className="rounded-lg object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Nav buttons */}
            <div className="flex justify-between mt-4 sm:mt-5">
              <Button
                variant="ghost"
                onClick={() => setCur(Math.max(0, cur - 1))}
                disabled={cur === 0}
              >
                ← Sebelumnya
              </Button>
              <Button
                variant={answers[cur] !== undefined ? "primary" : "ghost"}
                onClick={() => setCur(Math.min(questions.length - 1, cur + 1))}
                disabled={cur === questions.length - 1}
              >
                Selanjutnya →
              </Button>
            </div>
          </Card>

          {/* Ragu-ragu toggle */}
          <div className="mt-3 flex justify-center sm:justify-end">
            <button
              type="button"
              data-testid="ragu-ragu-toggle"
              onClick={() => toggleRaguRagu(cur)}
              aria-pressed={!!raguRagu[cur]}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border transition-all ${
                raguRagu[cur]
                  ? "bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200"
                  : "bg-white border-gray-200 text-gray-600 hover:border-yellow-300 hover:text-yellow-700"
              }`}
            >
              <span aria-hidden="true">{raguRagu[cur] ? "🚩" : "⚑"}</span>
              {raguRagu[cur] ? "Batalkan Ragu-ragu" : "Tandai Ragu-ragu"}
            </button>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-[72px] flex flex-col gap-3">
            <Card className="p-3">
              <QuestionGrid
                sections={sections}
                answered={answered}
                totalQuestions={questions.length}
                answers={answers}
                raguRagu={raguRagu}
                cur={cur}
                onSelect={setCur}
                variant="sidebar"
              />
            </Card>
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Bar ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2">
          {/* Progress + current info */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 truncate">
                {answered}/{questions.length} dijawab
              </span>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: currentSection.color }}
              />
              <span
                className="text-[11px] font-bold truncate"
                style={{ color: currentSection.color }}
              >
                {q.category} #{cur + 1}
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(answered / questions.length) * 100}%`,
                  background: currentSection.color,
                }}
              />
            </div>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setCur(Math.max(0, cur - 1))}
              disabled={cur === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 bg-gray-100 disabled:opacity-30 active:bg-gray-200"
            >
              ‹
            </button>
            <button
              onClick={() => setCur(Math.min(questions.length - 1, cur + 1))}
              disabled={cur === questions.length - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 bg-gray-100 disabled:opacity-30 active:bg-gray-200"
            >
              ›
            </button>
          </div>

          {/* Daftar Soal */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileNav(true)}
            className="!px-2.5 !py-1.5 text-[11px] flex-shrink-0"
          >
            📋 Soal
          </Button>
        </div>
      </div>

      {/* ── Mobile Question Grid Modal ── */}
      <Modal
        open={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        title="Daftar Soal"
        width="min(95vw, 520px)"
      >
        {/* Category summary */}
        <div className="flex gap-2 mb-4">
          {sections.map((sec) => {
            const done = sec.indices.filter(
              (i) => answers[i] !== undefined,
            ).length;
            return (
              <div
                key={sec.label}
                className="flex-1 rounded-lg p-2 text-center"
                style={{ background: `${sec.color}15` }}
              >
                <div className="text-xs font-bold" style={{ color: sec.color }}>
                  {sec.label}
                </div>
                <div className="text-xs text-gray-600">
                  {done}/{sec.indices.length}
                </div>
              </div>
            );
          })}
        </div>

        <QuestionGrid
          sections={sections}
          answered={answered}
          totalQuestions={questions.length}
          answers={answers}
          raguRagu={raguRagu}
          cur={cur}
          onSelect={handleSelectQuestion}
          variant="modal"
        />
      </Modal>

      {/* ── Simpan & Keluar — Confirmation Modal ── */}
      <Modal
        open={showExitConfirm}
        onClose={() => {
          if (!updateAnswers.isPending) {
            setShowExitConfirm(false);
            setExitError(null);
          }
        }}
        title="Simpan & Keluar?"
        width="min(95vw, 440px)"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Jawaban dan sisa waktu kamu akan disimpan. Kamu bisa melanjutkan
            tryout ini nanti dari daftar tryout.
          </p>

          {/* Progress summary */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Soal dijawab
              </div>
              <div
                className="font-black text-lg text-brand mt-0.5"
                data-testid="exit-answered-count"
              >
                {answered} / {questions.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Sisa waktu
              </div>
              <div
                className="font-black text-lg text-brand mt-0.5"
                data-testid="exit-time-left"
              >
                ⏱ {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Inline error from the last PUT attempt — modal stays open so the
              user can retry without losing the open state. */}
          {exitError && (
            <div
              role="alert"
              data-testid="exit-error"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              {exitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowExitConfirm(false);
                setExitError(null);
              }}
              disabled={updateAnswers.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirmExit}
              disabled={updateAnswers.isPending}
              data-testid="exit-confirm-button"
            >
              {updateAnswers.isPending ? "Menyimpan…" : "Simpan & Keluar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
