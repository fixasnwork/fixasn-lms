'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateAttemptAnswers } from './useTryoutQueries';

const AUTOSAVE_DELAY = 60_000;

export function useAutosaveAnswers({
  attemptId,
  phase,
  timeLeft,
  shouldRehydrateRef,
}: {
  attemptId: string | undefined;
  phase: 'ready' | 'running' | 'result';
  timeLeft: number;
  shouldRehydrateRef: React.MutableRefObject<boolean>;
}) {
  const queryClient = useQueryClient();
  const updateAnswers = useUpdateAttemptAnswers(attemptId ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef<Record<number, number>>({});

  const syncAnswers = useCallback((a: Record<number, number>) => {
    answersRef.current = a;
  }, []);

  // ── Stable callbacks via refs (avoid effect re-runs from render-cycle changes) ──
  const flushRef = useRef<() => void>(() => {});
  const schedRef = useRef<() => void>(() => {});
  const phaseRef = useRef(phase);
  const timeRef = useRef(timeLeft);
  const attemptRef = useRef(attemptId);

  // Keep refs in sync on every render — intentional perf optimization.
  // eslint-disable-next-line react-hooks/refs
  phaseRef.current = phase;
  // eslint-disable-next-line react-hooks/refs
  timeRef.current = timeLeft;
  // eslint-disable-next-line react-hooks/refs
  attemptRef.current = attemptId;

  // eslint-disable-next-line react-hooks/refs
  flushRef.current = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const current = answersRef.current;
    if (attemptRef.current && Object.keys(current).length > 0) {
      // Carry the live timer alongside the answers so the server can
      // restore the countdown on the next mount / resume.
      updateAnswers.mutate({ answers: current, timeLeftSeconds: timeRef.current });
    }
  };

  // eslint-disable-next-line react-hooks/refs
  schedRef.current = () => {
    if (phaseRef.current !== 'running' || timeRef.current < 5000) return;
    if (Object.keys(answersRef.current).length === 0) return;
    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      const current = answersRef.current;
      if (attemptRef.current && Object.keys(current).length > 0) {
        // Carry the live timer alongside the answers so the server can
        // restore the countdown on the next mount / resume.
        updateAnswers.mutate({ answers: current, timeLeftSeconds: timeRef.current });
      }
      timerRef.current = null;
    }, AUTOSAVE_DELAY);
  };

  const tryScheduleAutosave = useCallback(() => {
    schedRef.current();
  }, []);

  const flushAnswers = useCallback(() => {
    flushRef.current();
  }, []);

  // Cancel timer on phase/timeLeft threshold
  useEffect(() => {
    if (phase !== 'running' || timeLeft < 5000) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [phase, timeLeft]);

  // Lifecycle listeners (mount/unmount only — stable via refs)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushRef.current();
      } else {
        shouldRehydrateRef.current = true;
        if (attemptRef.current) queryClient.invalidateQueries({ queryKey: ['attempt', attemptRef.current] });
      }
    };
    const handlePageHide = () => {
      // sendBeacon: build a JSON body containing both answers and the latest
      // timer snapshot so the server can restore state on the next mount.
      // We keep using Blob + 'application/json' here — the existing sendBeacon
      // behaviour (out of scope for this change) is preserved.
      const blob = new Blob(
        [JSON.stringify({ answers: answersRef.current, timeLeftSeconds: timeRef.current })],
        { type: 'application/json' },
      );
      if (attemptRef.current) navigator.sendBeacon(`/api/tryout-attempts/${attemptRef.current}`, blob);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      flushRef.current();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tryScheduleAutosave, flushAnswers, syncAnswers };
}
