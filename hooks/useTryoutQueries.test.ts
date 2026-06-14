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

