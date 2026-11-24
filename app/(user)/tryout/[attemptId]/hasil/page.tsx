"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAttempt } from "@/hooks/useTryoutQueries";
import TryoutCompletion from "@/components/tryout/TryoutCompletion";
import PageLoading from "@/components/ui/PageLoading";

export default function TryoutResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();
  const { data, isPending, isFetching, error } = useAttempt(attemptId);

  useEffect(() => {
    if (!isFetching && data && !data.attempt.finishedAt) router.replace(`/tryout/${attemptId}`);
  }, [data, isFetching, attemptId, router]);

  if (error) return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-6">
      <p role="alert" className="text-sm text-red-700">{error.message}</p>
      <button type="button" onClick={() => router.push("/tryout")} className="mt-4 min-h-11 cursor-pointer rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-brand">Kembali ke Daftar Tryout</button>
    </div>
  );

  if (isPending || !data?.attempt.finishedAt) return <PageLoading label="Memuat hasil tryout..." />;

  return <TryoutCompletion questions={data.tryout.questions} answers={data.attempt.answers} totalScore={data.attempt.totalScore} tryoutId={data.tryout.id} onReview={() => router.push(`/tryout/${attemptId}`)} onBack={() => router.push("/tryout")} />;
}
