import type { QuestionCategory } from "@/lib/types";

export default function QuestionHeader({ id, number, category, topicName }: {
  id: string;
  number: number;
  category: QuestionCategory;
  topicName?: string | null;
}) {
  return (
    <div className="flex max-w-full min-w-0 items-center gap-3">
      <h2 id={id} className="inline-flex shrink-0 items-center rounded-xl bg-primary px-4 py-2 text-base font-bold text-primary-foreground">No. {number}</h2>
      <div className="min-w-0">
        <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">{category}</p>
        {topicName?.trim() && <p className="wrap-break-word text-sm font-bold leading-snug text-slate-900 sm:text-base">{topicName.trim()}</p>}
      </div>
    </div>
  );
}
