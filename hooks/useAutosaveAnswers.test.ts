import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Hoisted mocks
const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }));
const { mockInvalidate } = vi.hoisted(() => ({ mockInvalidate: vi.fn() }));

vi.mock('@/hooks/useTryoutQueries', () => ({
  useUpdateAttemptAnswers: () => ({ mutate: mockMutate }),
  useLogoConfig: () => ({ data: null }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidate,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      cancelQueries: vi.fn(),
    }),
  };
});

import { useAutosaveAnswers } from './useAutosaveAnswers';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

/** Returns { sync, schedule, flush, shouldRehydrateRef, maybeRerender } */
function setupHook(overrides: Record<string, unknown> = {}) {
  const shouldRehydrateRef = { current: false };
  const wrapper = makeWrapper();
  let sync: (a: Record<number, number>) => void = () => {};
  let schedule: () => void = () => {};

  renderHook(
    () => {
      const result = useAutosaveAnswers({
        attemptId: 'att-auto',
        phase: 'running',
        timeLeft: 300_000,
        shouldRehydrateRef,
        ...overrides,
      } as Parameters<typeof useAutosaveAnswers>[0]);
      sync = result.syncAnswers;
      schedule = result.tryScheduleAutosave;
      return result;
    },
    { wrapper },
  );

  return { sync, schedule, shouldRehydrateRef };
}

describe('useAutosaveAnswers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('navigator', {
      sendBeacon: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('schedules a 60s flush when no timer is running', async () => {
    const { sync, schedule } = setupHook();

    // Seed answers and call schedule — should start a 60s timer
    act(() => sync({ 0: 1 }));
    act(() => schedule());

    expect(mockMutate).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(60_000); });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({ 0: 1 });
  });

  it('tryScheduleAutosave is no-op when a timer is already running (no-reset)', () => {
    const { sync, schedule } = setupHook();

    act(() => sync({ 0: 1 }));
    act(() => schedule()); // starts timer
    expect(mockMutate).not.toHaveBeenCalled();

    // Update answers and call schedule again — no second timer
    act(() => sync({ 0: 2, 2: 3 }));
    act(() => schedule());

    // Advance 60s — fire only once
    act(() => { vi.advanceTimersByTime(60_000); });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    // Should fire with latest ref contents
    expect(mockMutate).toHaveBeenCalledWith({ 0: 2, 2: 3 });
  });

  it('does not schedule when there are no answers', () => {
    const { schedule } = setupHook();
    act(() => schedule());

    act(() => { vi.advanceTimersByTime(60_000); });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not schedule when phase is not running', () => {
    const { sync, schedule } = setupHook({ phase: 'ready' });

    act(() => sync({ 0: 1 }));
    act(() => schedule());

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not schedule when timeLeft < 5000', () => {
    const { sync, schedule } = setupHook({ timeLeft: 4000 });

    act(() => sync({ 0: 1 }));
    act(() => schedule());

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('triggers re-fetch on visibility visible', () => {
    const { shouldRehydrateRef } = setupHook();

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['attempt', 'att-auto'] });
    expect(shouldRehydrateRef.current).toBe(true);
  });

  it('sends beacon on pagehide', async () => {
    const { sync } = setupHook();
    act(() => sync({ 0: 1, 1: 2 }));

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = vi.mocked(navigator.sendBeacon).mock.calls[0];
    expect(url).toBe('/api/tryout-attempts/att-auto');
    const body = JSON.parse(await (blob as Blob).text());
    expect(body).toEqual({ answers: { 0: 1, 1: 2 } });
  });
});
