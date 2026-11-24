"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BatteryCharging, Check, CirclePlay, ClipboardList, Clock3, Flag, LogOut, NotebookPen, RotateCcw, Save, ShieldCheck, VolumeX, Wifi } from "lucide-react";
import type { Question } from "@/lib/types";
import { getScore, formatTime } from "@/lib/scoring";
import { Button, Card, Modal } from "@/components/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/shadcn/sheet";
import {
  useUpdateAttemptFlags,
  useUpdateAttemptAnswers,
  queueFlagUpdate,
} from "@/hooks/useTryoutQueries";
import { useAutosaveAnswers } from "@/hooks/useAutosaveAnswers";
import { useNavGuardStore } from "@/store/useNavGuardStore";
import TryoutReviewMode from "./TryoutReviewMode";
import TryoutCompletion from "./TryoutCompletion";
import QuestionHeader from "./QuestionHeader";

const playerButton = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm";

const preparationTips = [
  { Icon: NotebookPen, label: "Sediakan kertas coretan", color: "bg-blue-50 text-blue-700" },
  { Icon: VolumeX, label: "Cari tempat yang tenang", color: "bg-violet-50 text-violet-700" },
  { Icon: ShieldCheck, label: "Kerjakan dengan jujur", color: "bg-teal-50 text-teal-700" },
  { Icon: Wifi, label: "Pastikan koneksi stabil", color: "bg-cyan-50 text-cyan-700" },
  { Icon: BatteryCharging, label: "Pastikan baterai cukup", color: "bg-amber-50 text-amber-700" },
  { Icon: LogOut, label: "Gunakan Simpan & Keluar saat jeda", color: "bg-rose-50 text-rose-700" },
];

// ── Types ──
interface Section {
  label: string;
  indices: number[];
  color: string;
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
}

function QuestionGrid({
  sections,
  answered,
  totalQuestions,
  answers,
  raguRagu,
  cur,
  onSelect,
}: QuestionGridProps) {
  const visibleSections = sections.filter(({ indices }) => indices.length > 0);

  return (
    <>
      <dl className="grid shrink-0 grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-50 p-2.5">
          <dt className="text-xs text-emerald-800">Terjawab</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-900">{answered}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <dt className="text-xs text-slate-600">Kosong</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{totalQuestions - answered}</dd>
        </div>
      </dl>
      <dl aria-label="Soal terjawab per kategori" className="mt-2 flex shrink-0 gap-2">
        {visibleSections.map(({ label, color, indices }) => (
          <div key={label} className="min-w-0 flex-1 rounded-lg bg-slate-50 px-2 py-2 text-center">
            <dt className="text-xs font-semibold" style={{ color }}>{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
              {indices.filter((index) => answers[index] >= 0).length}<span className="sr-only"> dari </span><span aria-hidden="true">/</span>{indices.length}
            </dd>
          </div>
        ))}
      </dl>
      <div aria-hidden="true" className="mt-3 mb-4 h-1.5 shrink-0 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${(answered / totalQuestions) * 100}%` }}
        />
      </div>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain p-0.5"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 transparent",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {visibleSections.map((sec) => (
            <div key={sec.label} className="mb-3">
              <p className="mb-1.5 text-xs font-bold" style={{ color: sec.color }}>{sec.label}</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1.5">
                {sec.indices.map((gi) => {
                  const isActive = gi === cur;
                  const isDone = answers[gi] >= 0;
                  const isFlagged = !!raguRagu[gi];
                  return (
                    <button
                      key={gi}
                      type="button"
                      onClick={() => onSelect(gi)}
                      aria-current={isActive ? "step" : undefined}
                      aria-label={
                        isFlagged
                          ? `Soal ${gi + 1}, ditandai Ragu-ragu${isDone ? ", sudah dijawab" : ""}`
                          : `Soal ${gi + 1}${isDone ? ", sudah dijawab" : ""}`
                      }
                      className={`aspect-square min-h-9 w-full cursor-pointer rounded-lg text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${isActive ? "ring-2 ring-inset ring-brand-secondary" : ""} ${isFlagged ? "bg-amber-400 text-amber-950" : isDone ? "bg-emerald-700 text-white" : isActive ? "bg-blue-50 text-brand" : "bg-slate-100 text-slate-600"}`}
                    >
                      {gi + 1}
                    </button>
                  );
                })}
              </div>
            </div>
        ))}
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        {[
          { color: "bg-blue-50 ring-1 ring-inset ring-brand-secondary", label: "Soal aktif" },
          { color: "bg-emerald-700", label: "Sudah dijawab" },
          { color: "bg-slate-100", label: "Belum dijawab" },
          { color: "bg-amber-400", label: "Ragu-ragu" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex gap-1.5 items-center text-xs text-slate-600"
          >
            <div
              className={`size-3 shrink-0 rounded ${item.color}`}
            />
            {item.label}
          </div>
        ))}
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
  const updateFlags = useUpdateAttemptFlags(attemptId ?? "");
  const updateAnswers = useUpdateAttemptAnswers(attemptId ?? "");
  const queryClient = useQueryClient();
  const DURATION = (durationMin || 100) * 60;

  const [answers, setAnswers] =
    useState<Record<number, number>>(preloadedAnswers);
  const [raguRagu, setRaguRagu] =
    useState<Record<number, boolean>>(preloadedRaguRagu);
  const [cur, setCur] = useState(0);
  // Restore a saved countdown even if no questions were answered.
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    Math.max(0, Math.min(DURATION, initialTimeLeftSeconds ?? DURATION)),
  );
  const [phase, setPhase] = useState<"ready" | "running" | "result">("ready");
  const [showReview, setShowReview] = useState(false);
  const [showSavedTime, setShowSavedTime] = useState(initialTimeLeftSeconds != null);
  const [startError, setStartError] = useState(false);
  const hasSavedStart = useRef(initialTimeLeftSeconds != null);
  const startPending = useRef(false);
  const mounted = useRef(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const finishPending = useRef(false);
  const finishRef = useRef<() => Promise<void>>(async () => {});
  const [exitError, setExitError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldRehydrate = useRef(false);
  const prevPreloaded = useRef(preloadedAnswers);
  const playerHeaderRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  const startTryout = useCallback(async () => {
    if (startPending.current) return;
    if (attemptId && !hasSavedStart.current) {
      startPending.current = true;
      setStartError(false);
      try {
        await updateAnswers.mutateAsync({ answers: {}, timeLeftSeconds: timeLeft });
        hasSavedStart.current = true;
        void queryClient.invalidateQueries({ queryKey: ["attempt-history"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      } catch {
        if (mounted.current) setStartError(true);
        return;
      } finally {
        startPending.current = false;
      }
      if (!mounted.current) return;
    }
    setPhase("running");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (finishPending.current) return 0;
          clearInterval(timerRef.current!);
          void finishRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [attemptId, updateAnswers, timeLeft, queryClient]);

  const finish = useCallback(async () => {
    if (finishPending.current) return;
    finishPending.current = true;
    setIsFinishing(true);
    setFinishError(false);
    try {
      if (attemptId) await updateFlags.mutateAsync(raguRagu);
      await onFinish?.(answers);
      if (timerRef.current) clearInterval(timerRef.current);
      setShowFinishConfirm(false);
      setPhase("result");
    } catch {
      setFinishError(true);
      setShowFinishConfirm(true);
    } finally {
      finishPending.current = false;
      setIsFinishing(false);
    }
  }, [answers, onFinish, attemptId, raguRagu, updateFlags]);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

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

  const retry = () => {
    setShowReview(false);
    setAnswers({});
    setCur(0);
    setTimeLeft(DURATION);
    setShowSavedTime(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ready");
  };

  const handleSelectQuestion = useCallback((index: number) => {
    setCur(index);
    setShowMobileNav(false);
    const question = questionRef.current;
    const header = playerHeaderRef.current;
    if (question && header && question.getBoundingClientRect().top < header.getBoundingClientRect().bottom) {
      header.parentElement?.scrollIntoView?.({ block: "start" });
    }
  }, []);

  // ── PHASE: READY ──
  if (phase === "ready") {
    const durMenit = Math.round(DURATION / 60);
    const answeredCount = questions.filter((_, index) => answers[index] >= 0).length;
    const isResume = showSavedTime || answeredCount > 0;
    const ActionIcon = isResume ? RotateCcw : CirclePlay;
    const actionColor = isResume
      ? "bg-amber-300 text-amber-950! hover:bg-amber-400 focus-visible:outline-amber-700"
      : "bg-brand text-white hover:bg-brand-dark focus-visible:outline-brand";

    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-xl w-full p-6 sm:p-8 lg:p-10 text-center">
          <div className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full sm:mb-5 sm:size-16 ${isResume ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-brand"}`}>
            <ClipboardList aria-hidden="true" className="size-7 sm:size-8" />
          </div>
          <h2 className="font-black text-xl sm:text-2xl text-brand mb-1 sm:mb-1.5">
            {setName}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-2 sm:mb-3">
            {isTrial && "Trial · "}{questions.length} soal · {durMenit} menit
          </p>
          <div className={`mb-4 inline-flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold sm:mb-6 sm:p-3 sm:text-sm ${isResume ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-brand"}`}>
            <Clock3 aria-hidden="true" className="size-4 shrink-0" />
            {isResume ? (
              <span>{showSavedTime && <>Sisa waktu <strong>{formatTime(timeLeft)}</strong> · </>}{answeredCount} dari {questions.length} soal terjawab</span>
            ) : (
              <span>Ujian berlangsung selama <strong>{durMenit} menit</strong>. Pastikan kamu siap!</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {preparationTips.map(({ Icon, label, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 sm:gap-2"
              >
                <div className={`flex size-11 items-center justify-center rounded-full sm:size-13 ${color}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-gray-700 text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {startError && <p role="alert" className="mb-3 text-sm text-red-700">Tryout belum bisa dimulai. Coba lagi.</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            {onBack && (
              <Button variant="outline" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-brand/5! hover:bg-brand/10! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={onBack} disabled={updateAnswers.isPending}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Kembali
              </Button>
            )}
            <Button
              variant="primary"
              className={`inline-flex min-h-11 flex-[2] items-center justify-center gap-2 bg-none! shadow-none! focus-visible:outline-2 focus-visible:outline-offset-2 ${actionColor}`}
              onClick={startTryout}
              disabled={updateAnswers.isPending}
            >
              <ActionIcon aria-hidden="true" className="size-4" />
              {updateAnswers.isPending ? "Membuka..." : isResume ? "Lanjutkan Tryout" : "Mulai Tryout"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── PHASE: RESULT ──
  if (phase === "result") {
    if (!showReview) return <TryoutCompletion questions={questions} answers={answers} totalScore={totals.TWK + totals.TIU + totals.TKP} onReview={() => setShowReview(true)} onBack={() => onBack?.()} />;
    return (
      <TryoutReviewMode
        questions={questions}
        answers={answers}
        name={setName}
        scores={{ twk: totals.TWK, tiu: totals.TIU, tkp: totals.TKP }}
        raguRaguFlags={raguRagu}
        onBack={() => onBack?.()}
        onRetry={retry}
      />
    );
  }
  // Running player.
  const q = questions[cur];
  const answered = questions.filter((_, index) => answers[index] >= 0).length;
  const sections: Section[] = [
    { label: "TWK", indices: [], color: "#1D4ED8" },
    { label: "TIU", indices: [], color: "#6D28D9" },
    { label: "TKP", indices: [], color: "#92400E" },
  ];
  questions.forEach((question, index) => {
    sections.find((section) => section.label === question.category)?.indices.push(index);
  });

  if (!q) {
    return <p role="alert" className="mx-auto max-w-xl rounded-2xl bg-white p-5 text-sm text-red-700">Soal tryout belum tersedia.</p>;
  }

  const optionSizes = "(max-width: 768px) 92vw, (max-width: 1280px) 58vw, 900px";
  const navigationProps = {
    sections,
    answered,
    totalQuestions: questions.length,
    answers,
    raguRagu,
    cur,
    onSelect: handleSelectQuestion,
  };

  return (
    <div data-tryout-player="" className="mx-auto grid w-full max-w-[1440px] min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <div ref={playerHeaderRef} className="sticky top-0 z-20 bg-background">
          <header className="flex min-h-18 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 sm:p-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand sm:flex">
                <ClipboardList aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base" title={setName}>{setName}</h1>
                <p className="mt-1 inline-flex rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground lg:hidden">No. {cur + 1}</p>
              </div>
            </div>

            <div role="timer" aria-label="Sisa waktu" className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 sm:px-3 ${timeLeft < 300 ? "bg-red-50 text-red-700" : "bg-blue-50 text-brand"}`}>
              <Clock3 aria-hidden="true" className="size-4 shrink-0" />
              <div>
                <p className="text-[11px] font-medium">Sisa waktu</p>
                <p className="text-sm font-semibold tabular-nums sm:text-lg">{formatTime(timeLeft)}</p>
              </div>
            </div>
          </header>
          <div className="mt-2 flex justify-start lg:hidden">
            <Sheet open={showMobileNav} onOpenChange={setShowMobileNav}>
              <SheetTrigger className={`${playerButton} bg-primary px-3 text-primary-foreground hover:bg-primary/90`}>
                <ClipboardList aria-hidden="true" className="size-4" />
                Daftar Soal
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[85dvh] overflow-hidden rounded-t-2xl"
                overlayClassName="bg-black/45 supports-backdrop-filter:backdrop-blur-none"
              >
                <SheetHeader className="shrink-0 pb-0">
                  <SheetTitle>Daftar Soal</SheetTitle>
                </SheetHeader>
                <div className="flex min-h-0 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                  <QuestionGrid {...navigationProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <section ref={questionRef} aria-labelledby="question-title" className="min-w-0 rounded-2xl bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <QuestionHeader id="question-title" number={cur + 1} category={q.category} topicName={q.topicName} />
            {raguRagu[cur] && (
              <span data-testid="ragu-ragu-badge" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                <Flag aria-hidden="true" className="size-3" /> Ragu-ragu
              </span>
            )}
          </div>

          <p className="mt-4 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-900 sm:text-base sm:leading-7">{q.question}</p>
          {q.questionImage && (
            <div className="relative mt-4 h-44 w-full rounded-xl bg-slate-50 sm:h-64">
              <Image src={q.questionImage} alt="Gambar soal" fill sizes={optionSizes} className="rounded-xl object-contain" />
            </div>
          )}

          <div className="mt-5 grid gap-2.5" role="group" aria-label="Pilihan jawaban">
            {q.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = answers[cur] === index;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setAnswers({ ...answers, [cur]: index });
                    tryScheduleAutosave();
                  }}
                  className={`flex min-h-13 w-full min-w-0 cursor-pointer items-start gap-3 rounded-xl p-3 text-left text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:items-center sm:p-3.5 ${isSelected ? "bg-blue-50 text-brand ring-2 ring-inset ring-brand-secondary" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${isSelected ? "bg-brand text-white" : "bg-white text-slate-700"}`}>{letter}</span>
                  <span className="block min-w-0 flex-1 wrap-break-word">
                    {option.optionText && <span className="whitespace-pre-wrap">{option.optionText}</span>}
                    {option.optionImage && (
                      <span className="relative mt-1 block h-24 w-full sm:h-36">
                        <Image src={option.optionImage} alt={`Gambar pilihan ${letter}`} fill sizes={optionSizes} className="rounded-lg object-contain object-left" />
                      </span>
                    )}
                  </span>
                  {isSelected && <Check aria-hidden="true" className="mt-2 size-4 shrink-0 sm:mt-0" />}
                </button>
              );
            })}
          </div>

          {q.category === "TKP" && (
            <p className="mt-3 text-xs text-slate-600">Pilih jawaban yang paling mencerminkan dirimu.</p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-between">
            <button type="button" className={`${playerButton} bg-slate-100 text-slate-700 hover:bg-slate-200`} onClick={() => handleSelectQuestion(cur - 1)} disabled={cur === 0}>
              <ArrowLeft aria-hidden="true" className="size-4 shrink-0" /> Sebelumnya
            </button>
            <button
              type="button"
              data-testid="ragu-ragu-toggle"
              aria-pressed={!!raguRagu[cur]}
              onClick={() => toggleRaguRagu(cur)}
              className={`${playerButton} order-last col-span-2 text-amber-950 sm:order-none ${raguRagu[cur] ? "bg-amber-400 hover:bg-amber-500" : "bg-amber-200 hover:bg-amber-300"}`}
            >
              <Flag aria-hidden="true" className="size-4 shrink-0" /> {raguRagu[cur] ? "Batalkan Ragu-ragu" : "Tandai Ragu-ragu"}
            </button>
            <button type="button" className={`${playerButton} bg-brand text-white hover:bg-brand-dark`} onClick={() => handleSelectQuestion(cur + 1)} disabled={cur === questions.length - 1}>
              Selanjutnya <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </button>
          </div>
        </section>
      </div>

      <aside aria-label="Navigator dan tindakan tryout" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]">
        <section aria-labelledby="question-nav-title" className="hidden min-h-0 flex-col rounded-2xl bg-white p-4 lg:flex">
          <h2 id="question-nav-title" className="mb-3 flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList aria-hidden="true" className="size-4 text-brand-secondary" /> Navigator Soal
          </h2>
          <QuestionGrid {...navigationProps} />
        </section>
        <div className="grid shrink-0 gap-2 rounded-2xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-1">
          {attemptId && (
            <button type="button" data-testid="simpan-keluar-button" className={`${playerButton} bg-emerald-700 text-white hover:bg-emerald-800`} onClick={() => setShowExitConfirm(true)} disabled={updateAnswers.isPending}>
              <Save aria-hidden="true" className="size-4" /> Simpan &amp; Keluar
            </button>
          )}
          <Dialog open={showFinishConfirm} onOpenChange={(open) => {
            if (isFinishing) return;
            setShowFinishConfirm(open);
            setFinishError(false);
          }}>
            <DialogTrigger className={`${playerButton} bg-red-700 text-white hover:bg-red-800`}>
              <Check aria-hidden="true" className="size-4" /> Selesaikan Tryout
            </DialogTrigger>
            <DialogContent showCloseButton={false} overlayClassName="bg-black/45 supports-backdrop-filter:backdrop-blur-none">
              <DialogHeader>
                <DialogTitle>Selesaikan tryout?</DialogTitle>
                <DialogDescription>
                  {answered < questions.length && <>{questions.length - answered} soal belum dijawab. </>}
                  Setelah tryout selesai, jawaban tidak bisa diubah.
                </DialogDescription>
              </DialogHeader>
              {finishError && <p role="alert" className="text-sm text-red-700">Tryout belum berhasil diselesaikan. Coba lagi.</p>}
              <DialogFooter>
                <button type="button" className={`${playerButton} bg-slate-100 text-slate-700 hover:bg-slate-200`} onClick={() => {
                  setShowFinishConfirm(false);
                  setFinishError(false);
                }} disabled={isFinishing}>
                  Batal
                </button>
                <button type="button" className={`${playerButton} bg-red-700 text-white hover:bg-red-800`} onClick={finish} disabled={isFinishing}>
                  {isFinishing ? "Menyelesaikan..." : "Ya, Selesaikan"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

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
              className="flex-1 bg-emerald-700 bg-none! shadow-none! hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
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
