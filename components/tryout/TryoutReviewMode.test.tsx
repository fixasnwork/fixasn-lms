import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TryoutReviewMode from './TryoutReviewMode';
import type { Question } from '@/lib/types';

const baseQuestion: Question = {
  id: 1,
  category: 'TWK',
  question: 'Sample?',
  correctAnswer: 0,
  questionImage: null,
  explanation: null,
  explanationImage: null,
  options: [
    { id: 1, questionId: 1, optionIndex: 0, optionText: 'A', optionImage: null, tkpValue: null },
    { id: 2, questionId: 1, optionIndex: 1, optionText: 'B', optionImage: null, tkpValue: null },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeQuestions(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({ ...baseQuestion, id: i + 1, question: `Q${i + 1}` }));
}

describe('TryoutReviewMode — Ragu-ragu flag', () => {
  it('shows "X dari Y soal ditandai Ragu-ragu" summary', () => {
    const questions = makeQuestions(10);
    const answers: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const raguRaguFlags: Record<number, boolean> = { 0: true, 2: true, 4: true, 6: true, 8: true };

    render(
      <TryoutReviewMode
        questions={questions}
        answers={answers}
        name="Test"
        scores={{ twk: 25, tiu: 30, tkp: 150 }}
        raguRaguFlags={raguRaguFlags}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByTestId('ragu-ragu-summary')).toHaveTextContent('5 dari 10 soal ditandai Ragu-ragu');
  });

  it('shows 0 of Y when no questions are flagged', () => {
    const questions = makeQuestions(3);
    const answers: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    render(
      <TryoutReviewMode
        questions={questions}
        answers={answers}
        name="Test"
        scores={{ twk: 5, tiu: 5, tkp: 15 }}
        raguRaguFlags={{}}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByTestId('ragu-ragu-summary')).toHaveTextContent('0 dari 3 soal ditandai Ragu-ragu');
  });

  it('renders a Ragu-ragu pill on flagged questions and not on others', () => {
    const questions = makeQuestions(3);
    const answers: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    const raguRaguFlags: Record<number, boolean> = { 1: true };

    const { container } = render(
      <TryoutReviewMode
        questions={questions}
        answers={answers}
        name="Test"
        scores={{ twk: 5, tiu: 5, tkp: 15 }}
        raguRaguFlags={raguRaguFlags}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    // Question 0 is displayed by default. It is not flagged.
    expect(screen.queryByTestId('review-pill')).not.toBeInTheDocument();

    // Click question 2 (index 1) — flagged. Pill should appear.
    const navButtons = container.querySelectorAll('button[aria-label]');
    const target = Array.from(navButtons).find((b) => b.getAttribute('aria-label')?.includes('ditandai Ragu-ragu'));
    expect(target).toBeDefined();
    fireEvent.click(target!);
    expect(screen.getByTestId('review-pill')).toBeInTheDocument();

    // Click question 1 (index 0) — not flagged. Pill should disappear.
    const target2 = Array.from(navButtons).find(
      (b) => b.getAttribute('aria-label') === 'Soal 1'
    );
    fireEvent.click(target2!);
    expect(screen.queryByTestId('review-pill')).not.toBeInTheDocument();
  });

  it('does not render any flag toggle button in review mode (read-only)', () => {
    const questions = makeQuestions(1);
    const answers: Record<number, number> = { 0: 0 };
    const { container } = render(
      <TryoutReviewMode
        questions={questions}
        answers={answers}
        name="Test"
        scores={{ twk: 5, tiu: 5, tkp: 15 }}
        raguRaguFlags={{ 0: true }}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(container.querySelector('[data-testid="ragu-ragu-toggle"]')).toBeNull();
  });
});
