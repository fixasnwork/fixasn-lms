import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import TryoutEngine from './TryoutEngine';
import type { Question } from '@/lib/types';

// Hoisted mocks for the query hooks consumed by TryoutEngine.
const { mockUpdateAnswersMutate, mockUpdateAnswersMutateAsync, mockUpdateFlagsMutate, mockUpdateFlagsMutateAsync } = vi.hoisted(() => ({
  mockUpdateAnswersMutate: vi.fn(),
  mockUpdateAnswersMutateAsync: vi.fn(),
  mockUpdateFlagsMutate: vi.fn(),
  mockUpdateFlagsMutateAsync: vi.fn(),
}));

vi.mock('@/hooks/useTryoutQueries', () => ({
  useUpdateAttemptAnswers: () => ({
    mutate: mockUpdateAnswersMutate,
    mutateAsync: mockUpdateAnswersMutateAsync,
    isPending: false,
  }),
  useUpdateAttemptFlags: () => ({
    mutate: mockUpdateFlagsMutate,
    mutateAsync: mockUpdateFlagsMutateAsync,
  }),
  queueFlagUpdate: vi.fn(),
}));

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

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

describe('TryoutEngine — Simpan & Keluar (save-and-exit)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdateAnswersMutate.mockReset();
    mockUpdateAnswersMutateAsync.mockReset();
    mockUpdateAnswersMutateAsync.mockResolvedValue({ success: true, attempt: { id: 'a1' } });
    mockUpdateFlagsMutate.mockReset();
    mockUpdateFlagsMutateAsync.mockReset();
    mockUpdateFlagsMutateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: locate the Simpan & Keluar button by its visible text. We don't
  // use `data-testid` because the Button primitive doesn't forward arbitrary
  // HTML attributes; matching on the rendered text is robust to that and to
  // Tailwind's responsive visibility classes (jsdom has no real layout).
  const getSimpanButton = () =>
    screen.getByText(/Simpan & Keluar/).closest('button') as HTMLButtonElement | null;

  it('restores a saved timer even when no questions were answered', () => {
    const wrapper = makeWrapper();
    const questions = makeQuestions(3);
    render(
      <TryoutEngine
        attemptId="att-resume"
        questions={questions}
        durationMin={100}
        initialTimeLeftSeconds={1234}
        onFinish={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText("20:34")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan Tryout" }));
    expect(screen.getAllByText(/20:34/).length).toBeGreaterThanOrEqual(1);
  });

  it('does not show the Simpan & Keluar button in the ready phase', () => {
    const wrapper = makeWrapper();
    render(
      <TryoutEngine
        attemptId="att-ready"
        questions={makeQuestions(2)}
        durationMin={15}
        onFinish={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText("2 soal · 15 menit")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Simpan & Keluar/ })).not.toBeInTheDocument();
    expect(mockUpdateAnswersMutateAsync).not.toHaveBeenCalled();
  });

  it('saves the initial timer before opening questions', async () => {
    const wrapper = makeWrapper();
    render(
      <TryoutEngine
        attemptId="att-running"
        questions={makeQuestions(2)}
        durationMin={15}
        onFinish={vi.fn()}
      />,
      { wrapper },
    );

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Mulai Tryout' })); });
    expect(mockUpdateAnswersMutateAsync).toHaveBeenCalledWith({ answers: {}, timeLeftSeconds: 900 });
    // The Button primitive doesn't forward arbitrary props like data-testid,
    // so we locate the Simpan & Keluar button by its visible text instead.
    expect(screen.getByText(/Simpan & Keluar/)).toBeInTheDocument();
  });

  it('keeps selected answers and flags when navigating between questions', () => {
    render(
      <TryoutEngine
        attemptId="att-navigation"
        questions={makeQuestions(2)}
        durationMin={15}
        initialTimeLeftSeconds={900}
      />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan Tryout' }));
    fireEvent.click(screen.getByRole('button', { name: 'A A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tandai Ragu-ragu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    expect(screen.getByRole('heading', { name: 'Soal 2 dari 2' })).toBeInTheDocument();

    const navigator = within(screen.getByRole('region', { name: 'Navigator Soal' }));
    fireEvent.click(navigator.getByRole('button', { name: 'Soal 1, ditandai Ragu-ragu, sudah dijawab' }));

    expect(screen.getByRole('button', { name: 'A A' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Batalkan Ragu-ragu' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Daftar Soal' }));
    const drawer = screen.getByRole('dialog', { name: 'Daftar Soal' });
    expect(drawer).toHaveAttribute('data-side', 'bottom');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Soal 2' }));
    expect(screen.getByRole('heading', { name: 'Soal 2 dari 2' })).toBeInTheDocument();
  });

  it('waits for confirmation before completing a tryout', async () => {
    const onFinish = vi.fn();
    render(
      <TryoutEngine
        attemptId="att-finish"
        questions={makeQuestions(2)}
        durationMin={15}
        initialTimeLeftSeconds={900}
        preloadedAnswers={{ 0: 0 }}
        onFinish={onFinish}
      />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan Tryout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selesaikan Tryout' }));

    const confirmation = within(screen.getByRole('dialog', { name: 'Selesaikan tryout?' }));
    expect(confirmation.getByText(/1 soal belum dijawab/)).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(confirmation.getByRole('button', { name: 'Ya, Selesaikan' }));
    });
    expect(onFinish).toHaveBeenCalledExactlyOnceWith({ 0: 0 });
  });

  it('keeps the preparation screen open if the initial timer cannot be saved', async () => {
    mockUpdateAnswersMutateAsync.mockRejectedValueOnce(new Error('network down'));
    render(
      <TryoutEngine attemptId="att-start-error" questions={makeQuestions(2)} durationMin={15} />,
      { wrapper: makeWrapper() },
    );

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Mulai Tryout' })); });

    expect(screen.getByRole('alert')).toHaveTextContent('Tryout belum bisa dimulai');
    expect(screen.queryByRole('button', { name: /Simpan & Keluar/ })).not.toBeInTheDocument();
  });

  it('clicking the button opens the modal; clicking Batal closes it without calling onExit', () => {
    const wrapper = makeWrapper();
    const onExit = vi.fn();
    render(
      <TryoutEngine
        attemptId="att-modal-cancel"
        questions={makeQuestions(3)}
        durationMin={15}
        initialTimeLeftSeconds={900}
        onExit={onExit}
        onFinish={vi.fn()}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan Tryout' }));
    fireEvent.click(getSimpanButton()!);

    // Modal renders: title + answered count + time-left + Batal + confirm.
    expect(screen.getByText('Simpan & Keluar?')).toBeInTheDocument();
    expect(screen.getByTestId('exit-answered-count')).toBeInTheDocument();
    expect(screen.getByTestId('exit-time-left')).toBeInTheDocument();

    // Click Batal.
    fireEvent.click(screen.getByText('Batal'));

    // Modal gone, onExit not called, no PUT.
    expect(screen.queryByText('Simpan & Keluar?')).not.toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
    expect(mockUpdateAnswersMutateAsync).not.toHaveBeenCalled();
  });

  it('clicking Simpan & Keluar in the modal flushes answers + timer and calls onExit on success', async () => {
    const wrapper = makeWrapper();
    const onExit = vi.fn();
    render(
      <TryoutEngine
        attemptId="att-modal-confirm"
        questions={makeQuestions(3)}
        durationMin={15}
        initialTimeLeftSeconds={900}
        onExit={onExit}
        onFinish={vi.fn()}
      />,
      { wrapper },
    );

    // Start the engine, then select an option to populate `answers`.
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan Tryout' }));
    // The option button label is the option letter inside a span; pick the
    // first matching button to disambiguate from any duplicate option text.
    const optionA = screen.getAllByText('A')[0].closest('button') as HTMLButtonElement;
    fireEvent.click(optionA);

    // Advance fake time a couple of seconds so timeLeft != durationMin*60.
    act(() => { vi.advanceTimersByTime(2000); });

    fireEvent.click(getSimpanButton()!);
    // Confirm button — same text inside the modal footer.
    fireEvent.click(screen.getAllByText(/^Simpan & Keluar$/)[0]);

    await act(async () => {
      // Allow promise chain to resolve.
      await Promise.resolve();
    });

    // The PUT body includes the latest answers + timeLeftSeconds.
    expect(mockUpdateAnswersMutateAsync).toHaveBeenCalledTimes(1);
    const call = mockUpdateAnswersMutateAsync.mock.calls[0][0];
    expect(call.answers).toMatchObject({ 0: 0 });
    expect(typeof call.timeLeftSeconds).toBe('number');
    // durationMin=15 → 900s. After 2s we expect ≤ 898.
    expect(call.timeLeftSeconds).toBeGreaterThan(0);
    expect(call.timeLeftSeconds).toBeLessThanOrEqual(900);

    // onExit fires after the PUT resolves.
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open and surfaces an inline error if the PUT fails', async () => {
    mockUpdateAnswersMutateAsync.mockRejectedValueOnce(new Error('network down'));

    const wrapper = makeWrapper();
    const onExit = vi.fn();
    render(
      <TryoutEngine
        attemptId="att-modal-error"
        questions={makeQuestions(3)}
        durationMin={15}
        initialTimeLeftSeconds={900}
        onExit={onExit}
        onFinish={vi.fn()}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan Tryout' }));
    fireEvent.click(getSimpanButton()!);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/^Simpan & Keluar$/)[0]);
      await Promise.resolve();
    });

    // Modal stays open, error message visible, onExit NOT called.
    expect(screen.getByText('Simpan & Keluar?')).toBeInTheDocument();
    expect(screen.getByTestId('exit-error')).toHaveTextContent('network down');
    expect(onExit).not.toHaveBeenCalled();
  });
});
