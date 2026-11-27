"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuestionCategory } from '@/lib/types';

export interface BankQuestion {
  id: number;
  category: QuestionCategory;
  question: string;
  questionImage: string | null;
  topic: { name: string } | null;
}

export function useQuestionBank(filters: { tryoutId: number; page: number; search: string; category: string; topic: string }) {
  return useQuery<{ questions: BankQuestion[]; total: number; page: number; pageSize: number }>({
    queryKey: ['question-bank', filters],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ tryoutId: String(filters.tryoutId), page: String(filters.page), search: filters.search });
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.topic !== 'all') params.set('topic', filters.topic);
      const response = await fetch(`/api/admin/question-bank?${params}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat bank soal.');
      return data;
    },
  });
}

export function useAttachQuestions(tryoutId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (questionIds: number[]): Promise<{ success: boolean; addedCount: number }> => {
      const response = await fetch(`/api/tryouts/${tryoutId}/questions/attach`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan soal.');
      return data;
    },
    onSuccess: () => Promise.all([
      ['tryout-questions'], ['tryouts'], ['all-tryouts'], ['question-bank'], ['attempt'], ['dashboard', 'summary'],
    ].map((queryKey) => client.invalidateQueries({ queryKey }))),
  });
}
