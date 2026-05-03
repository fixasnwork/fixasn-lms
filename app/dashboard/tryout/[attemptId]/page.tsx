"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/types";
import { getScore, calculateScoring } from "@/lib/scoring";
import { useAppStore } from "@/store/useAppStore";
import TryoutEngine from "@/components/tryout/TryoutEngine";
import { Button, Badge, Card } from "@/components/ui";
import { useAttempt, useUpdateAttempt } from "@/hooks/useTryoutQueries";

export default function TryoutAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const router = useRouter();
  const durationMin = useAppStore((s) => s.durationMin);

  const { data, isFetching, error } = useAttempt(attemptId);
  const updateAttempt = useUpdateAttempt(attemptId);

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Memuat tryout...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="font-black text-xl text-[#1B3A6B] mb-2">
            Tryout Tidak Ditemukan
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat tryout."}
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/dashboard/tryout")}
          >
            ← Kembali ke Daftar Tryout
          </Button>
        </div>
      </div>
    );
  }

  const { attempt, tryout } = data;
  const isCompleted = attempt.totalScore > 0;

  // If completed, show review mode
  if (isCompleted) {
    return (
      <ReviewModeView
        questions={tryout.questions}
        answers={attempt.answers}
        name={tryout.name}
        scores={{
          twk: attempt.twkScore,
          tiu: attempt.tiuScore,
          tkp: attempt.tkpScore,
        }}
        onBack={() => router.push("/dashboard/tryout")}
        onRetry={async () => {
          // Create new attempt for the same tryout
          try {
            const res = await fetch("/api/tryout-attempts/resume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tryoutId: tryout.id }),
            });
            const result = await res.json();
            if (result.success) {
              router.push(`/dashboard/tryout/${result.attempt.id}`);
            }
          } catch {
            // Fallback: just go back to list
            router.push("/dashboard/tryout");
          }
        }}
      />
    );
  }

  // In-progress: show tryout engine
  return (
    <TryoutEngine
      questions={tryout.questions}
      durationMin={tryout.isTrial ? 15 : durationMin || 100}
      setName={tryout.isTrial ? "Trial Gratis" : tryout.name}
      isTrial={tryout.isTrial}
      preloadedAnswers={attempt.answers}
      onFinish={async (answers: Record<number, number>) => {
        try {
          const scores = calculateScoring(tryout.questions, answers);
          await updateAttempt.mutateAsync({
            twkScore: scores.TWK,
            tiuScore: scores.TIU,
            tkpScore: scores.TKP,
            totalScore: scores.total,
            answers,
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : "Gagal menyimpan hasil");
        }
      }}
      onBack={() => router.push("/dashboard/tryout")}
    />
  );
}

// ── REVIEW MODE VIEW ──
function ReviewModeView({
  questions,
  answers,
  name,
  scores,
  onBack,
  onRetry,
}: {
  questions: Question[];
  answers: Record<number, number>;
  name: string;
  scores: { twk: number; tiu: number; tkp: number };
  onBack: () => void;
  onRetry: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];
  const userAns = answers[idx];
  const score = getScore(q, userAns);
  const isCorrect = q.category !== "TKP" ? userAns === q.correctAnswer : null;
  const statusColor =
    q.category === "TKP" ? "#7C3AED" : isCorrect ? "#16A34A" : "#DC2626";
  const statusLabel =
    q.category === "TKP"
      ? "Karakteristik Pribadi"
      : isCorrect
        ? "Benar"
        : "Salah";

  return (
    <div className="min-h-screen bg-[#F8FAFF] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with scores */}
        <div className="flex items-center gap-3.5 mb-5 flex-wrap">
          <Button variant="outline" onClick={onBack}>
            ← Kembali
          </Button>
          <h2 className="font-black text-xl text-[#1B3A6B] m-0">
            Pembahasan — {name}
          </h2>
          <div className="ml-auto flex gap-3 text-sm font-bold">
            <span className="text-blue-600">TWK: {scores.twk}</span>
            <span className="text-purple-600">TIU: {scores.tiu}</span>
            <span className="text-yellow-600">TKP: {scores.tkp}</span>
            <span className="text-[#1B3A6B]">
              Total: {scores.twk + scores.tiu + scores.tkp}
            </span>
          </div>
        </div>

        {/* Question navigator */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-semibold text-gray-400">Soal</span>
          <div className="flex gap-1 flex-wrap max-w-md">
            {questions.map((_, i) => {
              const a = answers[i];
              const q2 = questions[i];
              let bg = "#F1F5F9";
              let col = "#9CA3AF";
              if (a !== undefined) {
                if (q2.category === "TKP") {
                  bg = "#F5F3FF";
                  col = "#7C3AED";
                } else if (a === q2.correctAnswer) {
                  bg = "#F0FDF4";
                  col = "#16A34A";
                } else {
                  bg = "#FEF2F2";
                  col = "#DC2626";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-7 h-7 rounded border-none cursor-pointer text-xs font-semibold transition-all ${
                    i === idx ? "ring-2 ring-offset-1 ring-[#1B3A6B]" : ""
                  }`}
                  style={{
                    background: i === idx ? "#1B3A6B" : bg,
                    color: i === idx ? "#fff" : col,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Retry button */}
        <div className="flex justify-end mb-5">
          <Button variant="primary" onClick={onRetry}>
            🔄 Ulangi Tryout
          </Button>
        </div>

        {/* Question card */}
        <Card
          className="border-l-4 mb-4"
          style={{ borderLeftColor: statusColor }}
        >
          <div className="flex items-center gap-3 mb-3 flex-wrap">
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
            <span className="text-sm text-gray-500 font-semibold">
              Soal {idx + 1} dari {questions.length}
            </span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ color: statusColor, background: `${statusColor}15` }}
            >
              {statusLabel}
            </span>
            <span className="text-xs font-bold text-gray-500 ml-auto">
              Nilai kamu:{" "}
              <span className="font-black text-[#1B3A6B]">{score}</span> poin
            </span>
          </div>

          <p className="font-bold text-base text-gray-800 mb-3 leading-relaxed">
            {q.question}
          </p>
          {q.questionImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={q.questionImage}
              alt={`Ilustrasi soal ${idx + 1}`}
              className="max-w-full max-h-56 rounded-lg mb-4 border border-gray-200 object-contain bg-white"
            />
          )}

          {/* Options */}
          <div className="flex flex-col gap-2 mb-5">
            {q.options.map((opt, j) => {
              const isUser = userAns === j;
              const isJawaban = q.category !== "TKP" && q.correctAnswer === j;
              let bg = "#F9FAFB";
              let col = "#6B7280";
              let fw = 400;
              let border = "1px solid #F1F5F9";
              if (isJawaban) {
                bg = "#F0FDF4";
                col = "#15803D";
                fw = 700;
                border = "1.5px solid #86EFAC";
              } else if (isUser && q.category !== "TKP") {
                bg = "#FEF2F2";
                col = "#DC2626";
                fw = 600;
                border = "1.5px solid #FECACA";
              } else if (isUser && q.category === "TKP") {
                bg = "#F5F3FF";
                col = "#7C3AED";
                fw = 700;
                border = "1.5px solid #C4B5FD";
              }

              const dotColor = isJawaban
                ? "#16A34A"
                : isUser && q.category !== "TKP"
                  ? "#DC2626"
                  : isUser
                    ? "#7C3AED"
                    : "#E5E7EB";

              return (
                <div
                  key={j}
                  className="p-3 rounded-xl text-sm flex items-center gap-3"
                  style={{ background: bg, color: col, fontWeight: fw, border }}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs flex-shrink-0 text-white"
                    style={{ background: dotColor }}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>
                  <div className="flex-1">
                    {opt.optionText && <span>{opt.optionText}</span>}
                  </div>
                  {isUser && (
                    <span className="text-xs font-bold opacity-70 flex-shrink-0">
                      ← Pilihan kamu
                    </span>
                  )}
                  {isJawaban && !isUser && (
                    <span className="text-xs font-bold text-green-600 flex-shrink-0">
                      ✓ Jawaban benar
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {q.explanation ? (
            <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
              <p className="font-bold text-xs text-blue-700 mb-1">
                Pembahasan:
              </p>
              <div className="text-sm text-blue-800 leading-relaxed">
                {q.explanation}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
              <p className="text-xs text-gray-400 m-0">
                Pembahasan belum tersedia untuk soal ini.
              </p>
            </div>
          )}
        </Card>

        {/* Bottom nav */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            ← Soal Sebelumnya
          </Button>
          <span className="text-xs font-semibold text-gray-400">
            {idx + 1} / {questions.length}
          </span>
          <Button
            variant="primary"
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
            disabled={idx === questions.length - 1}
          >
            Soal Berikutnya →
          </Button>
        </div>
      </div>
    </div>
  );
}
