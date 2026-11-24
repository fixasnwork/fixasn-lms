"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useDeleteQuestionTopic, useQuestionTopics, useSaveQuestionTopic } from "@/hooks/useQuestionTopics";
import type { QuestionCategory } from "@/lib/types";

export default function QuestionTopicManager({ onClose }: { onClose: () => void }) {
  const query = useQuestionTopics();
  const save = useSaveQuestionTopic();
  const remove = useDeleteQuestionTopic();
  const [category, setCategory] = useState<QuestionCategory>("TWK");
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | undefined>();
  const busy = save.isPending || remove.isPending;
  const topics = (query.data ?? []).filter((topic) => topic.category === category);

  function clearDraft() {
    setEditId(undefined);
    setName("");
    save.reset();
    remove.reset();
  }

  return (
    <Modal open title="Kelola Topik Soal" onClose={onClose} width={600}>
      <p className="mb-4 text-sm leading-relaxed text-gray-500">Topik dikelompokkan per kategori dan bisa digunakan di semua tryout. Menghapus topik tidak menghapus soalnya.</p>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (!busy && name.trim()) save.mutate({ id: editId, category, name }, { onSuccess: clearDraft });
      }}>
        <div>
          <label htmlFor="topic-category" className="mb-1.5 block text-sm font-bold text-gray-700">Kategori topik</label>
          <select id="topic-category" value={category} disabled={busy || editId !== undefined}
            onChange={(event) => { setCategory(event.target.value as QuestionCategory); clearDraft(); }}
            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm disabled:bg-gray-50">
            {(["TWK", "TIU", "TKP"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="topic-name" className="mb-1.5 block text-sm font-bold text-gray-700">Nama topik</label>
          <input id="topic-name" required maxLength={120} value={name} disabled={busy} onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Pancasila" className="w-full rounded-lg border border-gray-200 p-2.5 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>{save.isPending ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Tambah Topik"}</Button>
          {editId && <Button size="sm" variant="ghost" disabled={busy} onClick={clearDraft}>Batal Edit</Button>}
        </div>
      </form>
      {(save.error || remove.error) && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{save.error?.message || remove.error?.message}</p>}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <h3 className="mb-3 text-sm font-bold text-brand">Topik {category}</h3>
        {query.isPending ? <p role="status" className="text-sm text-gray-500">Memuat topik...</p> : query.isError ? (
          <div role="alert" className="text-sm text-red-700">{query.error.message} <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()} className="rounded px-2 py-1 font-semibold underline">Coba Lagi</button></div>
        ) : topics.length ? (
          <ul className="space-y-2">
            {topics.map((topic) => (
              <li key={topic.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3">
                <span className="min-w-0 break-words text-sm font-medium text-gray-800">{topic.name}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} aria-label={`Edit topik ${topic.name}`} onClick={() => { clearDraft(); setEditId(topic.id); setName(topic.name); }} className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-brand disabled:opacity-50">Edit</button>
                  <button type="button" disabled={busy} aria-label={`Hapus topik ${topic.name}`} onClick={() => {
                    if (window.confirm(`Hapus topik "${topic.name}"? Soal dengan topik ini akan menjadi "Belum ditentukan".`)) {
                      remove.mutate(topic.id, { onSuccess: () => { if (editId === topic.id) clearDraft(); } });
                    }
                  }} className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">Belum ada topik {category}. Tambahkan topik pertama di atas.</p>}
      </div>
    </Modal>
  );
}
