"use client";

import { Button, Card } from "@/components/ui";

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
  });

  return (
    <Card className="w-full bg-white p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-base sm:text-lg text-gray-800 mb-0.5 truncate">
            {tryoutName}
          </h4>
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
          className="shrink-0 w-full sm:w-auto"
        >
          Lihat Pembahasan
        </Button>
      </div>
    </Card>
  );
}
