import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SoalTable from './SoalTable';
import type { Question } from '@/lib/types';

const sampleQuestion: Question = {
  id: 1,
  category: 'TWK',
  question: 'Contoh pertanyaan TWK',
  correctAnswer: 0,
  questionImage: null,
  explanation: null,
  explanationImage: null,
  options: [
    { id: 1, questionId: 1, optionIndex: 0, optionText: 'Jawaban A', optionImage: null, tkpValue: null },
    { id: 2, questionId: 1, optionIndex: 1, optionText: 'Jawaban B', optionImage: null, tkpValue: null },
    { id: 3, questionId: 1, optionIndex: 2, optionText: 'Jawaban C', optionImage: null, tkpValue: null },
    { id: 4, questionId: 1, optionIndex: 3, optionText: '', optionImage: null, tkpValue: null },
    { id: 5, questionId: 1, optionIndex: 4, optionText: '', optionImage: null, tkpValue: null },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('SoalTable', () => {
  it('renders mobile list and desktop table containers', () => {
    render(<SoalTable questions={[sampleQuestion]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByTestId('soal-mobile-list')).toBeInTheDocument();
    expect(screen.getByTestId('soal-desktop-table')).toBeInTheDocument();
  });

  it('shows question card content in mobile list', () => {
    render(<SoalTable questions={[sampleQuestion]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const mobileList = screen.getByTestId('soal-mobile-list');
    expect(within(mobileList).getByText('Contoh pertanyaan TWK')).toBeInTheDocument();
    expect(within(mobileList).getByText('Jawaban: A')).toBeInTheDocument();
  });

  it('calls handlers from mobile action buttons', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SoalTable questions={[sampleQuestion]} onEdit={onEdit} onDelete={onDelete} />);

    const mobileList = screen.getByTestId('soal-mobile-list');
    fireEvent.click(within(mobileList).getByRole('button', { name: /Edit/i }));
    fireEvent.click(within(mobileList).getByRole('button', { name: /Hapus/i }));

    expect(onEdit).toHaveBeenCalledWith(sampleQuestion);
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
