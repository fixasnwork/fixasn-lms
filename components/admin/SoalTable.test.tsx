import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SoalTable from './SoalTable';
import type { Question } from '@/lib/types';

// Mock next/image to render as <img> with data-next-image marker
// (intentional raw <img> in test mock so we can assert next/image is used via the data attribute)
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-next-image
    />
  ),
}));

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

const sampleQuestionWithImageOption: Question = {
  id: 2,
  category: 'TIU',
  question: 'Contoh pertanyaan TIU dengan gambar',
  correctAnswer: 1,
  questionImage: null,
  explanation: null,
  explanationImage: null,
  options: [
    { id: 6, questionId: 2, optionIndex: 0, optionText: '', optionImage: 'https://example.com/opt-a.png', tkpValue: null },
    { id: 7, questionId: 2, optionIndex: 1, optionText: 'Jawaban B', optionImage: 'https://example.com/opt-b.png', tkpValue: null },
    { id: 8, questionId: 2, optionIndex: 2, optionText: 'Jawaban C', optionImage: null, tkpValue: null },
    { id: 9, questionId: 2, optionIndex: 3, optionText: '', optionImage: null, tkpValue: null },
    { id: 10, questionId: 2, optionIndex: 4, optionText: '', optionImage: null, tkpValue: null },
  ],
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('SoalTable', () => {
  it('shows the assigned topic and legacy unassigned labels in both layouts', () => {
    render(<SoalTable questions={[{ ...sampleQuestion, topicId: 1 }, sampleQuestionWithImageOption]}
      topics={[{ id: 1, category: 'TWK', name: 'Pancasila' }]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    for (const testId of ['soal-mobile-list', 'soal-desktop-table']) {
      const view = within(screen.getByTestId(testId));
      expect(view.getByText('Topik: Pancasila')).toBeInTheDocument();
      expect(view.getByText('Topik: Belum ditentukan')).toBeInTheDocument();
    }
  });

  it('distinguishes empty filter results from an empty question bank', () => {
    render(<SoalTable questions={[]} isFiltered onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Tidak ada soal yang sesuai dengan filter.')).toBeInTheDocument();
  });

  it.each(['TWK', 'TIU'] as const)('shows %s option weights alongside the answer key in both layouts', (category) => {
    const question = { ...sampleQuestion, category, options: sampleQuestion.options.map((option, index) => ({
      ...option, tkpValue: index === 0 ? 5 : 0,
    })) };
    render(<SoalTable questions={[question]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    for (const testId of ['soal-mobile-list', 'soal-desktop-table']) {
      const view = within(screen.getByTestId(testId));
      expect(view.getByText('A=5')).toBeInTheDocument();
      expect(view.getByText('B=0')).toBeInTheDocument();
    }
    expect(screen.getByText('Jawaban: A')).toBeInTheDocument();
  });

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

  // ── New tests for option image display ──────────────────────────

  it('renders image-only option in mobile list', () => {
    render(<SoalTable questions={[sampleQuestionWithImageOption]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const mobileList = screen.getByTestId('soal-mobile-list');
    // Option A has no text but has image — should still be visible
    expect(within(mobileList).getByText((content) => content.includes('A.'))).toBeInTheDocument();
    const optionImages = within(mobileList).getAllByRole('img');
    // Should contain at least one option image (not questionImage, which is null)
    const optAImg = optionImages.find((img) => (img as HTMLImageElement).src.includes('opt-a.png'));
    expect(optAImg).toBeTruthy();
  });

  it('renders image-only option in desktop table', () => {
    render(<SoalTable questions={[sampleQuestionWithImageOption]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const desktopTable = screen.getByTestId('soal-desktop-table');
    // Option A has no text but has image — should still be visible
    expect(within(desktopTable).getByText((content) => content.includes('A.'))).toBeInTheDocument();
    const optionImages = within(desktopTable).getAllByRole('img');
    const optAImg = optionImages.find((img) => (img as HTMLImageElement).src.includes('opt-a.png'));
    expect(optAImg).toBeTruthy();
  });

  it('renders text alongside image when both present', () => {
    render(<SoalTable questions={[sampleQuestionWithImageOption]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const mobileList = screen.getByTestId('soal-mobile-list');
    // Option B has both text and image
    expect(within(mobileList).getByText((content) => content.includes('Jawaban B'))).toBeInTheDocument();
    const optionImages = within(mobileList).getAllByRole('img');
    const optBImg = optionImages.find((img) => (img as HTMLImageElement).src.includes('opt-b.png'));
    expect(optBImg).toBeTruthy();
    // Must use next/image (marked with data-next-image)
    expect(optBImg?.hasAttribute('data-next-image')).toBe(true);
  });

  it('text-only option still renders text only', () => {
    render(<SoalTable questions={[sampleQuestion]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const mobileList = screen.getByTestId('soal-mobile-list');
    // Option A has text only, no image
    expect(within(mobileList).getByText((content) => content.includes('Jawaban A'))).toBeInTheDocument();
    // questionImage is null, so no img elements should exist in mobile list for this question
    expect(within(mobileList).queryAllByRole('img')).toHaveLength(0);
  });
});
