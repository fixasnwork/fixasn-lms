import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useCreateOrResumeAttempt } from "@/hooks/useTryoutQueries";
import type { DashboardOpenTryout } from "@/lib/types";

const actionLabels = { "not-started": "Mulai", "in-progress": "Lanjutkan", finished: "Ulangi" };

export default function DashboardOpenTryouts({ tryouts }: { tryouts: DashboardOpenTryout[] }) {
  const router = useRouter();
  const createOrResume = useCreateOrResumeAttempt();

  return (
    <section aria-labelledby="open-tryouts-title" className="rounded-2xl bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="open-tryouts-title" className="font-semibold text-slate-900">Tryout Terbuka</h2>
        <Link href="/tryout" className="inline-flex min-h-11 items-center gap-1 rounded-md text-xs font-semibold text-brand-secondary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          Lihat Semua <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      {!tryouts.length && <p className="mt-2 text-sm text-slate-500">Belum ada tryout yang terbuka untukmu.</p>}

      {tryouts.length > 0 && <ul className="mt-2 space-y-2">
        {tryouts.map(({ tryoutId, name, answeredCount, questionCount, status }) => {
          const progress = questionCount ? (answeredCount / questionCount) * 100 : 0;
          const isWorking = createOrResume.isPending && createOrResume.variables === tryoutId;
          const action = actionLabels[status];

          return (
            <li key={tryoutId} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-brand/5 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand">
                <ClipboardList aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="wrap-break-word text-sm font-semibold text-slate-900">{name}</h3>
                {status === "in-progress" ? (
                  <>
                    <p className="mt-1 text-xs text-slate-600">{answeredCount} dari {questionCount} soal terjawab</p>
                    <div aria-hidden="true" className="mt-2 h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-brand/10">
                      <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${progress}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-600">{status === "finished" ? "Sudah selesai" : `${questionCount} soal`}</p>
                )}
                {createOrResume.isError && createOrResume.variables === tryoutId && (
                  <p role="alert" className="mt-2 text-xs text-red-700">Tryout belum bisa dibuka. Coba lagi atau cek akses di halaman Tryout.</p>
                )}
              </div>
              <button
                type="button"
                disabled={createOrResume.isPending}
                aria-label={isWorking ? `Membuka ${name}` : `${action} ${name}`}
                onClick={() => createOrResume.mutate(tryoutId, {
                  onSuccess: ({ attempt }) => router.push(`/tryout/${attempt.id}`),
                })}
                className="col-start-2 inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 justify-self-start rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 sm:col-start-auto"
              >
                {isWorking ? "Membuka..." : action} <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
