'use client';

import Image from "next/image";
import { getScore } from "@/lib/scoring";
import { Question } from "@/lib/types";
import { useState } from "react";
import { Badge, Button, Card } from "../ui";

export default function TryoutReviewMode({
  questions,
  answers,
  name,
  scores,
  raguRaguFlags = {},
  onBack,
  onRetry,
}: {
  questions: Question[];
  answers: Record<number, number>;
  name: string;
  scores: { twk: number; tiu: number; tkp: number };
  raguRaguFlags?: Record<number, boolean>;
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

  const flaggedCount = Object.values(raguRaguFlags).filter(Boolean).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-[#F8FAFF] p-2 sm:p-6 w-full">
      <div className="w-full px-2 sm:px-0">
        {/* Header with scores */}
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3.5 mb-5 flex-wrap">
          <Button variant="outline" onClick={onBack}>
            ← Kembali
          </Button>
          <h2 className="font-black text-xl text-brand m-0">
            Pembahasan — {name}
          </h2>
          <div className="sm:ml-auto flex flex-wrap gap-3 text-sm font-bold w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-blue-600">TWK: {scores.twk}</span>
            <span className="text-purple-600">TIU: {scores.tiu}</span>
            <span className="text-yellow-600">TKP: {scores.tkp}</span>
            <span className="text-brand">
              Total: {scores.twk + scores.tiu + scores.tkp}
            </span>
          </div>
        </div>

        {/* Question navigator */}
        <div className="w-full flex flex-col gap-2 mb-5">
          <span className="text-xs font-semibold text-gray-400">
            Navigasi Soal
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {questions.map((_, i) => {
              const a = answers[i];
              const q2 = questions[i];
              const isFlagged = !!raguRaguFlags[i];
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
                  aria-label={
                    isFlagged
                      ? `Soal ${i + 1}, ditandai Ragu-ragu`
                      : `Soal ${i + 1}`
                  }
                  className={`relative w-7 h-7 rounded border-none cursor-pointer text-xs font-semibold transition-all ${
                    i === idx ? "ring-2 ring-offset-1 ring-brand" : ""
                  }`}
                  style={{
                    background: i === idx ? "#1B3A6B" : bg,
                    color: i === idx ? "#fff" : col,
                  }}
                >
                  {i + 1}
                  {isFlagged && (
                    <span
                      aria-hidden="true"
                      data-testid={`review-flag-dot-${i}`}
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 ring-1 ring-white"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ragu-ragu summary stat */}
        <div
          data-testid="ragu-ragu-summary"
          className="mb-5 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="text-xl">🚩</span>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-bold text-yellow-800 uppercase tracking-wide">
                Ragu-ragu
              </span>
              <span className="text-sm sm:text-base font-black text-yellow-900">
                {flaggedCount} dari {totalQuestions} soal ditandai Ragu-ragu
              </span>
            </div>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
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
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ color: statusColor, background: `${statusColor}15` }}
            >
              {statusLabel}
            </span>
            {raguRaguFlags[idx] && (
              <span
                data-testid="review-pill"
                className="inline-flex items-center gap-1 text-xs font-bold text-yellow-800 bg-yellow-200/80 px-2.5 py-1 rounded-full"
              >
                <span aria-hidden="true">🚩</span> Ragu-ragu
              </span>
            )}
            <span className="text-xs font-bold text-gray-500 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0">
              Nilai kamu:{" "}
              <span className="font-black text-brand">{score}</span> poin
            </span>
          </div>

          <p className="font-bold text-sm sm:text-base text-gray-800 mb-3 leading-relaxed break-words">
            {q.question}
          </p>
          {q.questionImage && (
            <div className="relative w-full h-56 mb-4">
              <Image
                src={q.questionImage}
                alt={`Ilustrasi soal ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="rounded-lg border border-gray-200 object-contain bg-white"
              />
            </div>
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
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 text-white"
                    style={{ background: dotColor }}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>
                  <div className="flex-1 break-words min-w-0">
                    {opt.optionText && <span>{opt.optionText}</span>}
                  </div>
                  {isUser && (
                    <span className="text-xs font-bold opacity-70 shrink-0">
                      ← Pilihan kamu
                    </span>
                  )}
                  {isJawaban && !isUser && (
                    <span className="text-xs font-bold text-green-600 shrink-0">
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="w-full sm:w-auto"
          >
            ← Soal Sebelumnya
          </Button>
          <span className="text-xs font-semibold text-gray-400 order-first sm:order-0">
            {idx + 1} / {questions.length}
          </span>
          <Button
            variant="primary"
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
            disabled={idx === questions.length - 1}
            className="w-full sm:w-auto"
          >
            Soal Berikutnya →
          </Button>
        </div>
      </div>
    </div>
  );
}
