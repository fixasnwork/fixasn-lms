"use client";

import Image from 'next/image';
import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useQuestionTopics } from '@/hooks/useQuestionTopics';
import { useAttachQuestions, useQuestionBank } from '@/hooks/useQuestionBank';

export default function QuestionBankPicker({ tryoutId, tryoutName, onClose, onAttached }: {
  tryoutId: number;
  tryoutName: string;
  onClose: () => void;
  onAttached: (addedCount: number) => void;
}) {
  const [searchDraft, setSearchDraft] = useState('');
  const [filters, setFilters] = useState({ tryoutId, page: 1, search: '', category: 'all', topic: 'all' });
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const bank = useQuestionBank(filters);
  const topics = useQuestionTopics();
  const attach = useAttachQuestions(tryoutId);
  const questions = bank.data?.questions ?? [];
  const pageCount = Math.max(1, Math.ceil((bank.data?.total ?? 0) / 20));
  const availableTopics = (topics.data ?? []).filter((topic) => filters.category === 'all' || topic.category === filters.category);
  const inputClass = 'min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand';

  function toggle(id: number) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else if (next.size < 200) next.add(id);
      return next;
    });
  }

  return (
    <Modal open title="Pilih dari Bank Soal" width={820} onClose={() => { if (!attach.isPending) onClose(); }}
      footer={<>
        {attach.isError && <p role="alert" className="mb-3 text-sm text-red-700">{attach.error.message}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={selected.size === 0 || attach.isPending} onClick={() => setSelected(new Set())}>Kosongkan Pilihan</Button>
          <Button disabled={selected.size === 0 || attach.isPending || bank.isError} onClick={() => attach.mutate([...selected], { onSuccess: ({ addedCount }) => onAttached(addedCount) })}>
            {attach.isPending ? 'Menambahkan...' : `Tambahkan ${selected.size} Soal`}
          </Button>
        </div>
      </>}>
      <p className="mb-2 text-sm text-gray-600">Tambahkan soal ke <strong>{tryoutName}</strong>. Soal yang sudah ada di tryout ini tidak ditampilkan.</p>
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Soal digunakan bersama. Perubahan isi soal berlaku di semua tryout yang menggunakannya. Menghapus soal dari tryout hanya melepas tautannya.</p>
      <fieldset disabled={attach.isPending} className="min-w-0 space-y-4">
        <legend className="sr-only">Pilihan soal untuk {tryoutName}</legend>
        <form className="flex gap-2" onSubmit={(event) => {
          event.preventDefault();
          setFilters((previous) => ({ ...previous, search: searchDraft.trim(), page: 1 }));
        }}>
          <div className="min-w-0 flex-1">
            <label htmlFor="bank-search" className="sr-only">Cari soal</label>
            <input id="bank-search" type="search" maxLength={200} placeholder="Cari isi soal..." value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)} className={inputClass} />
          </div>
          <Button type="submit" size="sm">Cari</Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="bank-category" className="mb-1 block text-xs font-semibold text-gray-600">Kategori</label>
            <select id="bank-category" className={inputClass} value={filters.category} onChange={(event) => {
              setFilters((previous) => ({ ...previous, category: event.target.value, topic: 'all', page: 1 }));
            }}>
              <option value="all">Semua kategori</option>
              {['TWK', 'TIU', 'TKP'].map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bank-topic" className="mb-1 block text-xs font-semibold text-gray-600">Topik</label>
            <select id="bank-topic" className={inputClass} value={filters.topic} onChange={(event) => {
              setFilters((previous) => ({ ...previous, topic: event.target.value, page: 1 }));
            }}>
              <option value="all">Semua topik</option>
              <option value="unassigned">Belum ditentukan</option>
              {availableTopics.map((topic) => <option key={topic.id} value={topic.id}>{filters.category === 'all' ? `${topic.category} — ` : ''}{topic.name}</option>)}
            </select>
          </div>
        </div>
        {topics.isError && <p role="alert" className="text-sm text-red-700">Topik gagal dimuat. <button type="button" className="font-semibold underline" onClick={() => void topics.refetch()}>Coba muat topik lagi</button></p>}
        <p role="status" className="text-xs text-gray-500">{selected.size} soal dipilih (maksimal 200). Pilihan tetap tersimpan saat berpindah halaman atau filter.</p>
        {bank.isPending ? <p role="status" className="py-8 text-center text-sm text-gray-500">Memuat bank soal...</p>
          : bank.isError ? <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {bank.error.message} <button type="button" className="font-semibold underline" onClick={() => void bank.refetch()}>Coba lagi</button>
          </div>
          : <>
            {questions.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">Tidak ada soal yang tersedia untuk filter ini.</p>
              : <ul className="space-y-2">
                {questions.map((question) => (
                  <li key={question.id}>
                    <label className={`flex cursor-pointer gap-3 rounded-xl p-3 ${selected.has(question.id) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-blue-700" checked={selected.has(question.id)}
                        disabled={!selected.has(question.id) && selected.size >= 200} onChange={() => toggle(question.id)} />
                      <span className="min-w-0 text-sm text-gray-800">
                        <span className="mb-1 block text-xs font-semibold text-brand">#{question.id} · {question.category} · {question.topic?.name ?? 'Belum ditentukan'}</span>
                        <span className="block whitespace-pre-wrap wrap-break-word">{question.question || 'Soal berupa gambar'}</span>
                        {question.questionImage && <Image src={question.questionImage} alt={`Gambar soal ${question.id}`} width={480} height={240} className="mt-2 h-auto max-h-40 w-auto max-w-full rounded-lg object-contain" />}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>}
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <Button variant="outline" size="sm" disabled={filters.page <= 1 || bank.isFetching} onClick={() => setFilters((previous) => ({ ...previous, page: previous.page - 1 }))}>Sebelumnya</Button>
              <span>Halaman {filters.page} / {pageCount} · {bank.data?.total ?? 0} soal</span>
              <Button variant="outline" size="sm" disabled={filters.page >= pageCount || bank.isFetching} onClick={() => setFilters((previous) => ({ ...previous, page: previous.page + 1 }))}>Berikutnya</Button>
            </div>
          </>}
      </fieldset>
    </Modal>
  );
}
