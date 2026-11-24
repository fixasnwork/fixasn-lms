"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardList, Flag, RotateCcw, X } from "lucide-react";
import type { Question } from "@/lib/types";
import { getScore } from "@/lib/scoring";
import { Badge } from "@/components/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/shadcn/sheet";

const action = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm";
const imageSizes = "(max-width: 768px) 92vw, (max-width: 1280px) 58vw, 900px";
const categories = ["TWK", "TIU", "TKP"] as const;
const categoryColors = {
  TWK: "bg-blue-50 text-blue-800",
  TIU: "bg-violet-50 text-violet-800",
  TKP: "bg-amber-50 text-amber-800",
};
const statuses = {
  correct: { label: "Benar", tile: "bg-emerald-700 text-white", soft: "bg-emerald-50 text-emerald-800" },
  wrong: { label: "Salah", tile: "bg-red-700 text-white", soft: "bg-red-50 text-red-800" },
  empty: { label: "Tidak dijawab", tile: "bg-slate-100 text-slate-600", soft: "bg-slate-100 text-slate-600" },
  tkp: { label: "Penilaian TKP", tile: "bg-violet-700 text-white", soft: "bg-violet-50 text-violet-800" },
};

function questionStatus(question: Question, answer: number | undefined) {
  if (answer == null || !question.options[answer]) return "empty";
  if (question.category === "TKP") return "tkp";
  return answer === question.correctAnswer ? "correct" : "wrong";
}

interface Props {
  questions: Question[];
  answers: Record<number, number>;
  name: string;
  scores: { twk: number; tiu: number; tkp: number };
  raguRaguFlags: Record<number, boolean>;
  index: number;
  onSelect: (index: number) => void;
  onBack?: () => void;
  onRetry?: () => void;
}

function ReviewGrid({ questions, answers, raguRaguFlags, index, onSelect }: Props) {
  const counts = { correct: 0, wrong: 0, empty: 0, tkp: 0 };
  questions.forEach((question, i) => counts[questionStatus(question, answers[i])]++);
  return (
    <>
      <dl className="grid shrink-0 grid-cols-3 gap-2" aria-label="Ringkasan jawaban">
        {(["correct", "wrong", "empty"] as const).map((status) => (
          <div key={status} className={`rounded-xl p-2.5 ${statuses[status].soft}`}>
            <dt className="text-xs">{statuses[status].label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{counts[status]}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-slate-500">Benar dan salah untuk TWK &amp; TIU. TKP menggunakan bobot poin.</p>
      <div className="mt-4 min-h-0 overflow-y-auto overscroll-contain p-0.5" style={{ scrollbarWidth: "thin" }}>
        {categories.map((category) => {
          const indices = questions.flatMap((q, i) => q.category === category ? [i] : []);
          if (!indices.length) return null;
          return (
            <div key={category} className="mb-4">
              <p className="mb-2 flex justify-between text-xs font-semibold text-slate-600"><span>{category}</span><span>{indices.length} soal</span></p>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
                {indices.map((i) => (
                  <button key={i} type="button" aria-label={raguRaguFlags[i] ? `Soal ${i + 1}, ditandai Ragu-ragu` : `Soal ${i + 1}`} aria-current={i === index ? "step" : undefined} onClick={() => onSelect(i)} className={`relative aspect-square min-h-9 w-full cursor-pointer rounded-lg text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${raguRaguFlags[i] ? "bg-amber-400 text-amber-950" : statuses[questionStatus(questions[i], answers[i])].tile} ${i === index ? "ring-2 ring-offset-2 ring-brand-secondary" : ""}`}>
                    {i + 1}
                    <span className="sr-only">, {statuses[questionStatus(questions[i], answers[i])].label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded ring-2 ring-brand-secondary" />Soal aktif</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-amber-400" />Ragu-ragu</span>
      </div>
    </>
  );
}

export default function ReviewQuestionPlayer(props: Props) {
  const { questions, answers, name, scores, raguRaguFlags, index, onSelect, onBack, onRetry } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  const q = questions[index];
  const select = (next: number) => {
    if (next < 0 || next >= questions.length) return;
    onSelect(next);
    setMobileOpen(false);
    if (questionRef.current && headerRef.current && questionRef.current.getBoundingClientRect().top < headerRef.current.getBoundingClientRect().bottom) {
      headerRef.current.parentElement?.scrollIntoView?.({ block: "start" });
    }
  };
  const gridProps = { ...props, onSelect: select };

  if (!q) return <div className="rounded-2xl bg-white p-6"><p role="status" className="text-sm text-slate-600">Soal pembahasan belum tersedia.</p>{onBack && <button type="button" onClick={onBack} className={`${action} mt-4 bg-slate-100 text-slate-700`}>Kembali ke Daftar Tryout</button>}</div>;

  const answer = answers[index];
  const status = questionStatus(q, answer);
  const maxTkp = Math.max(0, ...q.options.map((option) => option.tkpValue ?? 0));
  const flaggedCount = questions.filter((_, i) => raguRaguFlags[i]).length;

  return (
    <div data-tryout-player="" data-tryout-review="" className="mx-auto grid w-full max-w-[1440px] min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <div ref={headerRef} className="sticky top-0 z-20 bg-background">
          <header className="rounded-2xl bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand sm:flex"><BookOpen aria-hidden="true" className="size-5" /></span>
                <div className="min-w-0"><p className="text-[11px] font-medium text-slate-500">Pembahasan tryout</p><h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base" title={name}>{name}</h1></div>
              </div>
              <div className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-brand"><p className="text-[11px]">Total skor</p><p className="text-lg font-semibold tabular-nums">{scores.twk + scores.tiu + scores.tkp}</p></div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {categories.map((category) => <div key={category} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ${categoryColors[category]}`}><dt>{category}</dt><dd className="font-semibold tabular-nums">{scores[category.toLowerCase() as keyof typeof scores]}</dd></div>)}
            </dl>
          </header>
          <div className="mt-2 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className={`${action} bg-primary text-primary-foreground hover:bg-primary/90`}><ClipboardList aria-hidden="true" className="size-4" />Daftar Soal</SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-hidden rounded-t-2xl" overlayClassName="bg-black/45 supports-backdrop-filter:backdrop-blur-none">
                <SheetHeader className="shrink-0 pb-0"><SheetTitle>Daftar Soal Pembahasan</SheetTitle></SheetHeader>
                <div className="flex min-h-0 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"><ReviewGrid {...gridProps} /></div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <section ref={questionRef} aria-labelledby="review-question-title" className="min-w-0 rounded-2xl bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="review-question-title" className="text-sm font-semibold text-slate-900">Soal {index + 1} dari {questions.length}</h2>
            <Badge color={q.category === "TWK" ? "blue" : q.category === "TIU" ? "purple" : "yellow"}>{q.category}</Badge>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statuses[status].soft}`}>{status === "correct" ? <Check aria-hidden="true" className="size-3" /> : status === "wrong" ? <X aria-hidden="true" className="size-3" /> : null}{statuses[status].label}</span>
            {raguRaguFlags[index] && <span data-testid="review-pill" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900"><Flag aria-hidden="true" className="size-3" />Ragu-ragu</span>}
            <span className="text-xs text-slate-500 sm:ml-auto">Nilai kamu: <strong className="text-slate-900">{getScore(q, answer)}</strong> poin</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-900 sm:text-base sm:leading-7">{q.question}</p>
          {q.questionImage && <div className="relative mt-4 h-44 w-full rounded-xl bg-slate-50 sm:h-64"><Image src={q.questionImage} alt={`Ilustrasi soal ${index + 1}`} fill sizes={imageSizes} className="rounded-xl object-contain" /></div>}

          <div className="mt-5 grid gap-2.5" role="group" aria-label="Jawaban dan kunci soal">
            {q.options.map((option, i) => {
              const selected = answer === i;
              const correct = q.category === "TKP" ? maxTkp > 0 && option.tkpValue === maxTkp : q.correctAnswer === i;
              const letter = String.fromCharCode(65 + i);
              const tone = correct ? "bg-emerald-50 text-emerald-900" : selected ? q.category === "TKP" ? "bg-violet-50 text-violet-900" : "bg-red-50 text-red-900" : "bg-slate-50 text-slate-700";
              return (
                <div key={option.id} className={`flex min-h-13 min-w-0 items-start gap-3 rounded-xl p-3 text-sm leading-relaxed sm:p-3.5 ${tone}`}>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold ${correct ? "bg-emerald-700 text-white" : selected ? q.category === "TKP" ? "bg-violet-700 text-white" : "bg-red-700 text-white" : "bg-white text-slate-700"}`}>{letter}</span>
                  <div className="min-w-0 flex-1 wrap-break-word">
                    {option.optionText && <p className="whitespace-pre-wrap">{option.optionText}</p>}
                    {option.optionImage && <div className="relative mt-1 h-24 w-full sm:h-36"><Image src={option.optionImage} alt={`Gambar pilihan ${letter}`} fill sizes={imageSizes} className="rounded-lg object-contain object-left" /></div>}
                    {(selected || correct || q.category === "TKP") && <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">{selected && <span>Pilihan kamu</span>}{correct && <span className="inline-flex items-center gap-1 text-emerald-700"><Check aria-hidden="true" className="size-3" />{q.category === "TKP" ? "Jawaban terbaik" : "Jawaban benar"}</span>}{q.category === "TKP" && <span>{option.tkpValue ?? 0} poin</span>}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {status === "empty" && <p className="mt-3 text-xs text-slate-500">Kamu tidak menjawab soal ini.</p>}
          {q.category === "TKP" && <p className="mt-3 text-xs leading-relaxed text-slate-500">Setiap pilihan TKP memiliki bobot nilai. Jawaban terbaik adalah pilihan dengan poin tertinggi.</p>}

          <section aria-labelledby="explanation-title" className="mt-5 rounded-xl bg-blue-50/70 p-4 sm:p-5">
            <h3 id="explanation-title" className="flex items-center gap-2 text-sm font-semibold text-brand"><BookOpen aria-hidden="true" className="size-4" />Pembahasan soal</h3>
            {q.explanation || q.explanationImage ? <>
              {q.explanation && <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-slate-700">{q.explanation}</p>}
              {q.explanationImage && <div className="relative mt-3 h-56 w-full sm:h-80"><Image src={q.explanationImage} alt={`Gambar pembahasan soal ${index + 1}`} fill sizes={imageSizes} className="rounded-lg object-contain object-left" /></div>}
            </> : <p className="mt-2 text-sm text-slate-500">Pembahasan belum tersedia untuk soal ini.</p>}
          </section>
          <nav aria-label="Navigasi pembahasan" className="mt-5 flex items-center justify-between gap-2">
            <button type="button" className={`${action} bg-slate-100 text-slate-700 hover:bg-slate-200`} onClick={() => select(index - 1)} disabled={index === 0}><ArrowLeft aria-hidden="true" className="size-4" />Sebelumnya</button>
            <span className="text-xs tabular-nums text-slate-400">{index + 1} / {questions.length}</span>
            <button type="button" className={`${action} bg-brand text-white hover:bg-brand-dark`} onClick={() => select(index + 1)} disabled={index === questions.length - 1}>Selanjutnya<ArrowRight aria-hidden="true" className="size-4" /></button>
          </nav>
        </section>
      </div>

      <aside aria-label="Navigator pembahasan" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]">
        <section className="hidden min-h-0 flex-col rounded-2xl bg-white p-4 lg:flex">
          <h2 className="mb-3 flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardList aria-hidden="true" className="size-4 text-brand-secondary" />Navigator Soal</h2>
          <ReviewGrid {...gridProps} />
        </section>
        <div className="shrink-0 rounded-2xl bg-white p-3">
          <p data-testid="ragu-ragu-summary" className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><Flag aria-hidden="true" className="size-4 shrink-0" />{flaggedCount} dari {questions.length} soal ditandai Ragu-ragu</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {onBack && <button type="button" onClick={onBack} className={`${action} bg-slate-100 text-slate-700 hover:bg-slate-200`}><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke Daftar Tryout</button>}
            {onRetry && <button type="button" onClick={onRetry} className={`${action} bg-brand text-white hover:bg-brand-dark`}><RotateCcw aria-hidden="true" className="size-4" />Ulangi Tryout</button>}
          </div>
        </div>
      </aside>
    </div>
  );
}
