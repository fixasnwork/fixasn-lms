import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import QuestionBankPicker from './QuestionBankPicker';

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), refetch: vi.fn(), fail: false }));
vi.mock('@/hooks/useQuestionTopics', () => ({ useQuestionTopics: () => ({ data: [
  { id: 7, category: 'TWK', name: 'Pancasila' }, { id: 8, category: 'TIU', name: 'Deret' },
], isError: false }) }));
vi.mock('@/hooks/useQuestionBank', () => ({
  useQuestionBank: (filters: { page: number; search: string }) => {
    mocks.query(filters);
    return {
      isPending: false, isFetching: false, isError: mocks.fail, error: new Error('Katalog gagal dimuat'), refetch: mocks.refetch,
      data: { questions: [{ id: filters.page, category: 'TWK', question: `Soal halaman ${filters.page}`, questionImage: null, topic: null }], total: 21, pageSize: 20 },
    };
  },
  useAttachQuestions: () => ({ mutate: mocks.mutate, isPending: false, isError: false }),
}));
beforeEach(() => { vi.clearAllMocks(); mocks.fail = false; });
afterEach(cleanup);

describe('question bank picker', () => {
  it('preserves selections across pages and submits them to the fixed target', () => {
    const onAttached = vi.fn();
    render(<QuestionBankPicker tryoutId={5} tryoutName="Tryout Lima" onClose={vi.fn()} onAttached={onAttached} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText(/2 soal dipilih/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByRole('checkbox')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan 2 Soal' }));
    expect(mocks.mutate).toHaveBeenCalledWith([1, 2], expect.objectContaining({ onSuccess: expect.any(Function) }));
    mocks.mutate.mock.calls[0][1].onSuccess({ addedCount: 2 });
    expect(onAttached).toHaveBeenCalledWith(2);
    expect(mocks.query.mock.lastCall?.[0].tryoutId).toBe(5);
  });
  it('searches, filters topics by category, and clears the topic when changing categories', () => {
    render(<QuestionBankPicker tryoutId={5} tryoutName="Tryout Lima" onClose={vi.fn()} onAttached={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari soal' }), { target: { value: 'Pancasila' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));
    expect(mocks.query.mock.lastCall?.[0]).toMatchObject({ search: 'Pancasila', page: 1 });
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'TWK' } });
    expect(screen.queryByRole('option', { name: 'Deret' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Topik'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'TIU' } });
    expect(mocks.query.mock.lastCall?.[0]).toMatchObject({ category: 'TIU', topic: 'all', page: 1 });
  });
  it('shows retry on catalog errors and blocks submitting without a selection', () => {
    mocks.fail = true;
    render(<QuestionBankPicker tryoutId={5} tryoutName="Tryout Lima" onClose={vi.fn()} onAttached={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Katalog gagal dimuat');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Tambahkan 0 Soal' })).toBeDisabled();
  });
});
