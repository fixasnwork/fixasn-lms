"use client";

import { Button, Card } from "@/components/ui";
import { BookOpen } from "lucide-react";

interface FinishedAttemptCardProps {
  attemptId: string;
  tryoutName: string;
  packageName: string;
  finishedAt: string;
  totalScore: number;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  onView: (attemptId: string) => void;
}

export default function FinishedAttemptCard({
  attemptId,
  tryoutName,
  packageName,
  finishedAt,
  totalScore,
  twkScore,
  tiuScore,
  tkpScore,
  onView,
}: FinishedAttemptCardProps) {
  const finishedDate = new Date(finishedAt);
  const formattedDate = finishedDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Makassar",
  });

  return (
    <Card className="w-full bg-white p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="wrap-break-word font-semibold text-slate-900">
            {tryoutName}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-1">
            {packageName} · {formattedDate}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold mt-2">
            <span className="text-blue-600">TWK: {twkScore}</span>
            <span className="text-purple-600">TIU: {tiuScore}</span>
            <span className="text-yellow-600">TKP: {tkpScore}</span>
            <span className="text-brand">
              Total: <span className="font-black">{totalScore}</span>
            </span>
          </div>
        </div>
        <Button
          variant="primary"
          data-testid="finished-attempt-view-pembahasan"
          onClick={() => onView(attemptId)}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 bg-teal-700 bg-none! hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:w-auto"
        >
          Pembahasan
          <BookOpen aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </div>
    </Card>
  );
}
