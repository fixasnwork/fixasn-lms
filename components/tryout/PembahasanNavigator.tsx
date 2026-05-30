'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Question } from '@/lib/types';
import { getScore } from '@/lib/scoring';
import { Button, Badge, Card } from '@/components/ui';

interface PembahasanNavigatorProps {
  questions: Question[];
  answers: Record<number, number>;
  name?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export default function PembahasanNavigator({
  questions,
  answers,
  name: _name,
  onBack,
  onRetry,
}: PembahasanNavigatorProps) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];
  const userAns = answers[idx];
  const score = getScore(q, userAns);
  const isCorrect = q.category !== 'TKP' ? userAns === q.correctAnswer : null;

  const statusColor =
    q.category === 'TKP' ? '#7C3AED' : isCorrect ? '#16A34A' : '#DC2626';
  const statusLabel =
    q.category === 'TKP' ? 'Karakteristik Pribadi' : isCorrect ? 'Benar' : 'Salah';

  return (
    <div>
      {/* Top navigation */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Kembali ke Dashboard
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">Soal</span>
          <div className="flex gap-1 flex-wrap max-w-md">
            {questions.map((_, i) => {
              const a = answers[i];
              const q2 = questions[i];
              let bg = '#F1F5F9';
              let col = '#9CA3AF';
              if (a !== undefined) {
                if (q2.category === 'TKP') {
                  bg = '#F5F3FF';
                  col = '#7C3AED';
                } else if (a === q2.correctAnswer) {
                  bg = '#F0FDF4';
                  col = '#16A34A';
                } else {
                  bg = '#FEF2F2';
                  col = '#DC2626';
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`
                    w-7 h-7 rounded border-none cursor-pointer text-xs font-semibold transition-all
                    ${i === idx ? 'ring-2 ring-offset-1 ring-[#1B3A6B]' : ''}
                  `}
                  style={{
                    background: i === idx ? '#1B3A6B' : bg,
                    color: i === idx ? '#fff' : col,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <Button variant="primary" onClick={onRetry}>
          🔄 Ulangi Tryout
        </Button>
      </div>

      {/* Question card */}
      <Card className="border-l-4 mb-4" style={{ borderLeftColor: statusColor }}>
        {/* Question header */}
        <div className="flex items-center gap-3 mb-3.5 flex-wrap">
          <Badge color={q.category === 'TWK' ? 'blue' : q.category === 'TIU' ? 'purple' : 'yellow'}>
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
            Nilai kamu:{' '}
            <span className="font-black text-[#1B3A6B]">{score}</span> poin
          </span>
        </div>

        {/* Question text */}
        <p className="font-bold text-base text-gray-800 mb-3 leading-relaxed">{q.question}</p>
        {q.questionImage && (
          <div className="relative w-full h-56 mb-4">
            <Image
              src={q.questionImage}
              alt="soal"
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="rounded-lg border border-gray-200 object-contain bg-white"
            />
          </div>
        )}

        {/* Answer options */}
        <div className="flex flex-col gap-2 mb-5">
          {q.options.map((opt, j) => {
            const isUser = userAns === j;
            const isJawaban = q.category !== 'TKP' && q.correctAnswer === j;
            let bg = '#F9FAFB';
            let col = '#6B7280';
            let fw = 'font-normal';
            let border = 'border border-gray-100';
            if (isJawaban) {
              bg = '#F0FDF4';
              col = '#15803D';
              fw = 'font-bold';
              border = 'border-2 border-green-300';
            } else if (isUser && q.category !== 'TKP') {
              bg = '#FEF2F2';
              col = '#DC2626';
              fw = 'font-semibold';
              border = 'border-2 border-red-300';
            } else if (isUser && q.category === 'TKP') {
              bg = '#F5F3FF';
              col = '#7C3AED';
              fw = 'font-bold';
              border = 'border-2 border-violet-300';
            }
            const optImg = opt.optionImage;

            const dotColor = isJawaban
              ? '#16A34A'
              : isUser && q.category !== 'TKP'
                ? '#DC2626'
                : isUser
                  ? '#7C3AED'
                  : '#E5E7EB';

            return (
              <div
                key={j}
                className={`p-3 rounded-xl text-sm bg-${bg} text-${col} ${fw} ${border} flex items-center gap-3`}
                style={{ background: bg, color: col, fontWeight: fw === 'font-bold' ? 700 : 400, border }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs flex-shrink-0 text-white"
                  style={{ background: dotColor }}
                >
                  {String.fromCharCode(65 + j)}
                </span>
                <div className="flex-1">
                  {opt.optionText && <span className="leading-relaxed">{opt.optionText}</span>}
                  {optImg && (
                    <div className="relative w-full h-28 mt-1">
                      <Image
                        src={optImg}
                        alt={`Opsi ${String.fromCharCode(65 + j)}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 600px"
                        className="rounded-lg object-contain bg-white"
                      />
                    </div>
                  )}
                </div>
                {isUser && (
                  <span className="text-xs font-bold opacity-70 flex-shrink-0">← Pilihan kamu</span>
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
            <p className="font-bold text-xs text-blue-700 mb-1">Pembahasan:</p>
            <div className="text-sm text-blue-800 leading-relaxed">{q.explanation}</div>
            {q.explanationImage && (
              <div className="relative w-full h-52 mt-2">
                <Image
                  src={q.explanationImage}
                  alt="pembahasan"
                  fill
                  sizes="(max-width: 640px) 100vw, 600px"
                  className="rounded-lg border border-blue-200 object-contain bg-white"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 m-0">
              Pembahasan belum tersedia untuk soal ini.
            </p>
          </div>
        )}
      </Card>

      {/* Bottom navigation */}
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
  );
}