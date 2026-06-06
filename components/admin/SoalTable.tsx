'use client';

import Image from 'next/image';
import type { Question } from '@/lib/types';
import { Badge, Button } from '@/components/ui';

interface SoalTableProps {
  questions: Question[];
  onEdit: (q: Question) => void;
  onDelete: (id: number) => void;
}

export default function SoalTable({ questions, onEdit, onDelete }: SoalTableProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Belum ada soal. Klik &quot;+ Tambah Soal&quot; untuk menambahkan.
      </div>
    );
  }

  return (
    <div>
      <div data-testid="soal-mobile-list" className="md:hidden flex flex-col gap-3">
        {questions.map((q, idx) => {
          // Sync twin: line 134 (desktop filledOpts filter) — keep in lockstep with desktop path
          const filledOpts = q.options.filter((o) => (o.optionText && o.optionText.trim().length > 0) || o.optionImage);
          return (
            <div key={q.id} className="rounded-xl border border-gray-100 bg-white p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 font-semibold mb-1">#{idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <Badge
                      color={
                        q.category === 'TWK'
                          ? 'blue'
                          : q.category === 'TIU'
                            ? 'purple'
                            : 'yellow'
                      }
                    >
                      {q.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(q)}>
                    ✏️ Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm('Hapus soal ini?')) onDelete(q.id as number);
                    }}
                  >
                    🗑️ Hapus
                  </Button>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-800 mb-2 break-words">{q.question}</p>
              {q.questionImage && (
                <div className="relative w-20 h-20 mb-2">
                  <Image
                    src={q.questionImage}
                    alt="soal"
                    width={80}
                    height={80}
                    className="rounded border border-gray-200 object-cover"
                  />
                </div>
              )}

              <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                {q.options.slice(0, filledOpts.length).map((opt, i) => (
                  <div key={i} className="break-words">
                    <div>
                      <span className="font-bold">{String.fromCharCode(65 + i)}.</span>{' '}
                      {opt.optionText}
                    </div>
                    {opt.optionImage && (
                      <div className="relative w-16 h-16 mt-1">
                        <Image
                          src={opt.optionImage}
                          alt={`Opsi ${String.fromCharCode(65 + i)}`}
                          width={64}
                          height={64}
                          className="rounded border border-gray-200 object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-xs">
                {q.category !== 'TKP' ? (
                  <span className="font-bold text-green-600">
                    Jawaban: {q.correctAnswer !== undefined && q.correctAnswer !== null ? String.fromCharCode(65 + q.correctAnswer) : '-'}
                  </span>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {q.options.map((opt, i) => opt.tkpValue != null && (
                      <span
                        key={i}
                        className="bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-bold"
                      >
                        {String.fromCharCode(65 + i)}={opt.tkpValue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div data-testid="soal-desktop-table" className="hidden md:block overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
              #
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
              Kategori
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
              Pertanyaan
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
              Opsi
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
              Jawaban
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, idx) => {
            // Sync twin: line 26 (mobile filledOpts filter) — keep in lockstep with mobile path
            const filledOpts = q.options.filter((o) => (o.optionText && o.optionText.trim().length > 0) || o.optionImage);
            return (
              <tr
                key={q.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2.5 text-xs text-gray-400 font-semibold">
                  {idx + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    color={
                      q.category === 'TWK'
                        ? 'blue'
                        : q.category === 'TIU'
                          ? 'purple'
                          : 'yellow'
                    }
                  >
                    {q.category}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="max-w-sm">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                      {q.question}
                    </p>
                    {q.questionImage && (
                      <div className="relative w-12 h-12 mt-1">
                        <Image
                          src={q.questionImage}
                          alt="soal"
                          width={48}
                          height={48}
                          className="rounded border border-gray-200 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  <div className="flex flex-col gap-0.5">
                    {q.options.slice(0, filledOpts.length).map((opt, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="line-clamp-1">
                          <span className="font-bold">{String.fromCharCode(65 + i)}.</span>{' '}
                          {opt.optionText}
                        </span>
                        {opt.optionImage && (
                          <div className="relative w-12 h-12 mt-1">
                            <Image
                              src={opt.optionImage}
                              alt={`Opsi ${String.fromCharCode(65 + i)}`}
                              width={48}
                              height={48}
                              className="rounded border border-gray-200 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {q.category !== 'TKP' ? (
                    <span className="font-bold text-green-600">
                      {q.correctAnswer !== undefined && q.correctAnswer !== null ? String.fromCharCode(65 + q.correctAnswer) : '-'}
                    </span>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      {q.options.map((opt, i) => opt.tkpValue != null && (
                        <span
                          key={i}
                          className="bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-bold"
                        >
                          {String.fromCharCode(65 + i)}={opt.tkpValue}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(q)}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm('Hapus soal ini?')) onDelete(q.id as number);
                      }}
                    >
                      🗑️
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
