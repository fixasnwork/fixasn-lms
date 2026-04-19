'use client';

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
        Belum ada soal. Klik "+ Tambah Soal" untuk menambahkan.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
            const filledOpts = q.opts.filter((o) => o && o.trim().length > 0);
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
                      q.cat === 'TWK'
                        ? 'blue'
                        : q.cat === 'TIU'
                          ? 'purple'
                          : 'yellow'
                    }
                  >
                    {q.cat}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="max-w-sm">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                      {q.q}
                    </p>
                    {q.qImg && (
                      <img
                        src={q.qImg}
                        alt="soal"
                        className="w-12 h-12 rounded border border-gray-200 object-cover mt-1"
                      />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  <div className="flex flex-col gap-0.5">
                    {q.opts.slice(0, filledOpts.length).map((opt, i) => (
                      <span key={i} className="line-clamp-1">
                        <span className="font-bold">{String.fromCharCode(65 + i)}.</span>{' '}
                        {opt}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {q.cat !== 'TKP' ? (
                    <span className="font-bold text-green-600">
                      {q.ans !== undefined ? String.fromCharCode(65 + q.ans) : '-'}
                    </span>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      {q.tkpVals?.map((v, i) => (
                        <span
                          key={i}
                          className="bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-bold"
                        >
                          {String.fromCharCode(65 + i)}={v}
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
  );
}