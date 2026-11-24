"use client";

import type { Question } from "@/lib/types";
import { useState } from "react";
import ReviewQuestionPlayer from "./ReviewQuestionPlayer";

export default function TryoutReviewMode({
  questions,
  answers,
  name,
  scores,
  raguRaguFlags = {},
  onBack,
  onRetry,
}: {
  questions: Question[];
  answers: Record<number, number>;
  name: string;
  scores: { twk: number; tiu: number; tkp: number };
  raguRaguFlags?: Record<number, boolean>;
  onBack: () => void;
  onRetry: () => void;
}) {
  const [idx, setIdx] = useState(0);

  return (
    <ReviewQuestionPlayer
      questions={questions}
      answers={answers}
      name={name}
      scores={scores}
      raguRaguFlags={raguRaguFlags}
      index={idx}
      onSelect={setIdx}
      onBack={onBack}
      onRetry={onRetry}
    />
  );
}
