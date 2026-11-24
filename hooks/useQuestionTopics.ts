"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QuestionCategory, QuestionTopic } from "@/lib/types";

const endpoint = "/api/admin/question-topics";

export function useQuestionTopics() {
  return useQuery<QuestionTopic[]>({
    queryKey: ["question-topics"],
    queryFn: async () => {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat topik soal.");
      return data.topics;
    },
  });
}

export function useSaveQuestionTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: number; category: QuestionCategory; name: string }): Promise<QuestionTopic> => {
      const response = await fetch(input.id ? `${endpoint}/${input.id}` : endpoint, {
        method: input.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.id ? { name: input.name } : { category: input.category, name: input.name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan topik.");
      return data.topic;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["question-topics"] }),
  });
}

export function useDeleteQuestionTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus topik.");
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["question-topics"] }),
      queryClient.invalidateQueries({ queryKey: ["tryout-questions"] }),
      queryClient.invalidateQueries({ queryKey: ["tryouts"] }),
      queryClient.invalidateQueries({ queryKey: ["attempt"] }),
    ]),
  });
}
