import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Hoisted fetch mock
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetch);

import {
  queueFlagUpdate,
  useUpdateAttemptFlags,
  useUpdateAttemptAnswers,
} from './useTryoutQueries';

describe('queueFlagUpdate — debounced flag writer', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  afterEach(async () => {
    // Flush any pending timers so tests don't leak.
    await new Promise((r) => setTimeout(r, 300));
  });

  it('coalesces rapid toggles into a single fetch with latest state', async () => {
    const attemptId = 'att-debounce-1';
    queueFlagUpdate(attemptId, { 0: true }, 100);
    queueFlagUpdate(attemptId, { 1: true }, 100);
    queueFlagUpdate(attemptId, { 2: false }, 100);

    await new Promise((r) => setTimeout(r, 200));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`/api/tryout-attempts/${attemptId}`);
    const body = JSON.parse(init.body);
    expect(body).toEqual({ raguRaguFlags: { 0: true, 1: true, 2: false } });
  });

  it('does not call fetch when queue is empty after debounce window', async () => {
    // No calls queued
    await new Promise((r) => setTimeout(r, 200));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('useUpdateAttemptFlags — optimistic mutation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  it('optimistically merges flags into the cached useAttempt data', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const attemptId = 'att-opt-1';

    // Seed cache
    qc.setQueryData(['attempt', attemptId], {
      attempt: {
        id: attemptId,
        userId: 'u@x.id',
        tryoutId: 1,
        twkScore: 0,
        tiuScore: 0,
        tkpScore: 0,
        totalScore: 0,
        answers: {},
        raguRagu: { 0: false },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      tryout: { id: 1, name: 'T', isTrial: true, sortOrder: 0, durationMin: 15, questions: [] },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateAttemptFlags(attemptId), { wrapper });

    await act(async () => {
      result.current.mutate({ 0: true, 1: true });
      // Yield so the async onMutate can run.
      await Promise.resolve();
    });

    // Optimistic update should be visible immediately.
    const cached = qc.getQueryData<{ attempt: { raguRagu: Record<number, boolean> } }>([
      'attempt',
      attemptId,
    ]);
    expect(cached?.attempt.raguRagu).toEqual({ 0: true, 1: true });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('rolls back on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const attemptId = 'att-rollback-1';

    qc.setQueryData(['attempt', attemptId], {
      attempt: {
        id: attemptId,
        userId: 'u@x.id',
        tryoutId: 1,
        twkScore: 0,
        tiuScore: 0,
        tkpScore: 0,
        totalScore: 0,
        answers: {},
        raguRagu: { 0: false },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      tryout: { id: 1, name: 'T', isTrial: true, sortOrder: 0, durationMin: 15, questions: [] },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateAttemptFlags(attemptId), { wrapper });

    act(() => {
      result.current.mutate({ 0: true });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cached = qc.getQueryData<{ attempt: { raguRagu: Record<number, boolean> } }>([
      'attempt',
      attemptId,
    ]);
    // Rollback to original value
    expect(cached?.attempt.raguRagu).toEqual({ 0: false });
  });
});

describe('useUpdateAttemptAnswers — autosave mutation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, attempt: { id: 'att-1' } }) });
  });

  function makeSeedCache(qc: QueryClient, attemptId: string) {
    qc.setQueryData(['attempt', attemptId], {
      attempt: {
        id: attemptId,
        userId: 'u@x.id',
        tryoutId: 1,
        twkScore: 0,
        tiuScore: 0,
        tkpScore: 0,
        totalScore: 0,
        finishedAt: null,
        answers: { 0: 1 },
        raguRagu: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      tryout: { id: 1, name: 'T', isTrial: true, sortOrder: 0, durationMin: 15, questions: [] },
    });
  }

  it('sends only answers in PUT body', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const attemptId = 'att-ans-1';
    makeSeedCache(qc, attemptId);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateAttemptAnswers(attemptId), { wrapper });

    await act(async () => {
      result.current.mutate({ 0: 2, 1: 3, 2: 0 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    // Only answers field — no scores, no flags
    expect(body).toEqual({ answers: { 0: 2, 1: 3, 2: 0 } });
    expect(body).not.toHaveProperty('twkScore');
    expect(body).not.toHaveProperty('raguRaguFlags');
  });

  it('does not mutate the cache (fire-and-forget)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const attemptId = 'att-ans-nocache-1';
    makeSeedCache(qc, attemptId);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateAttemptAnswers(attemptId), { wrapper });

    act(() => { result.current.mutate({ 0: 99 }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Cache should still hold the original seeded answers, not the autosaved ones.
    const cached = qc.getQueryData<{ attempt: { answers: Record<number, number> } }>([
      'attempt',
      attemptId,
    ]);
    expect(cached?.attempt.answers).toEqual({ 0: 1 });
  });

  it('rolls back on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const attemptId = 'att-ans-rollback-1';
    makeSeedCache(qc, attemptId);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateAttemptAnswers(attemptId), { wrapper });

    act(() => {
      result.current.mutate({ 0: 99 });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cached = qc.getQueryData<{ attempt: { answers: Record<number, number> } }>(['attempt', attemptId]);
    // Rollback to original
    expect(cached?.attempt.answers).toEqual({ 0: 1 });
  });
});

