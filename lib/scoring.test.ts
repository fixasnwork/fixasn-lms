import { describe, it, expect } from 'vitest';
import { getScore, calculateScoring, formatTime, formatCurrency } from './scoring';
import type { Question } from './types';

const twkQuestion: Question = {
  id: 1,
  category: 'TWK',
  question: 'Apa rumus luas lingkaran?',
  correctAnswer: 1,
  questionImage: null,
  explanation: null,
  explanationImage: null,
  options: [
    { id: 1, questionId: 1, optionIndex: 0, optionText: '2πr', optionImage: null, tkpValue: null },
    { id: 2, questionId: 1, optionIndex: 1, optionText: 'πr²', optionImage: null, tkpValue: null },
    { id: 3, questionId: 1, optionIndex: 2, optionText: 'πd', optionImage: null, tkpValue: null },
    { id: 4, questionId: 1, optionIndex: 3, optionText: '2πd', optionImage: null, tkpValue: null },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const tiuQuestion: Question = {
  id: 2,
  category: 'TIU',
  question: 'Berapa 5 + 3?',
  correctAnswer: 2,
  questionImage: null,
  explanation: null,
  explanationImage: null,
  options: [
    { id: 5, questionId: 2, optionIndex: 0, optionText: '6', optionImage: null, tkpValue: null },
    { id: 6, questionId: 2, optionIndex: 1, optionText: '7', optionImage: null, tkpValue: null },
    { id: 7, questionId: 2, optionIndex: 2, optionText: '8', optionImage: null, tkpValue: null },
    { id: 8, questionId: 2, optionIndex: 3, optionText: '9', optionImage: null, tkpValue: null },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const tkpQuestion: Question = {
  id: 3,
  category: 'TKP',
  question: 'Bagaimana sikap anda terhadap atasan?',
  correctAnswer: null,
  questionImage: null,
  explanation: null,
  explanationImage: null,
  options: [
    { id: 9, questionId: 3, optionIndex: 0, optionText: 'Menentang', optionImage: null, tkpValue: 1 },
    { id: 10, questionId: 3, optionIndex: 1, optionText: 'Acuh', optionImage: null, tkpValue: 2 },
    { id: 11, questionId: 3, optionIndex: 2, optionText: 'Menghormati', optionImage: null, tkpValue: 5 },
    { id: 12, questionId: 3, optionIndex: 3, optionText: 'Mengabaikan', optionImage: null, tkpValue: 3 },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('getScore', () => {
  it('returns 0 when answer is undefined', () => {
    expect(getScore(twkQuestion, undefined)).toBe(0);
  });

  it('returns 0 when answer is null', () => {
    expect(getScore(twkQuestion, null)).toBe(0);
  });

  it('returns 5 when TWK answer is correct', () => {
    expect(getScore(twkQuestion, 1)).toBe(5);
  });

  it('returns 0 when TWK answer is wrong', () => {
    expect(getScore(twkQuestion, 0)).toBe(0);
    expect(getScore(twkQuestion, 2)).toBe(0);
    expect(getScore(twkQuestion, 3)).toBe(0);
  });

  it('returns 5 when TIU answer is correct', () => {
    expect(getScore(tiuQuestion, 2)).toBe(5);
  });

  it('returns 0 when TIU answer is wrong', () => {
    expect(getScore(tiuQuestion, 0)).toBe(0);
  });

  it('returns TKP score based on tkpValues array', () => {
    expect(getScore(tkpQuestion, 0)).toBe(1);
    expect(getScore(tkpQuestion, 1)).toBe(2);
    expect(getScore(tkpQuestion, 2)).toBe(5);
    expect(getScore(tkpQuestion, 3)).toBe(3);
  });

  it('returns 0 when TKP answer index is out of bounds', () => {
    expect(getScore(tkpQuestion, 99)).toBe(0);
  });

  it('returns 0 when TKP answer is undefined', () => {
    expect(getScore(tkpQuestion, undefined)).toBe(0);
  });
});

describe('calculateScoring', () => {
  it('returns all zeros for empty questions', () => {
    const result = calculateScoring([], {});
    expect(result).toEqual({ TWK: 0, TIU: 0, TKP: 0, total: 0 });
  });

  it('returns all zeros when no answers provided', () => {
    const result = calculateScoring([twkQuestion, tiuQuestion, tkpQuestion], {});
    expect(result).toEqual({ TWK: 0, TIU: 0, TKP: 0, total: 0 });
  });

  it('correctly scores TWK questions', () => {
    const result = calculateScoring([twkQuestion], { 0: 1 }); // correct
    expect(result.TWK).toBe(5);
    expect(result.total).toBe(5);
  });

  it('correctly scores TIU questions', () => {
    const result = calculateScoring([tiuQuestion], { 0: 2 }); // correct
    expect(result.TIU).toBe(5);
    expect(result.total).toBe(5);
  });

  it('correctly scores TKP questions', () => {
    const result = calculateScoring([tkpQuestion], { 0: 2 }); // score 5
    expect(result.TKP).toBe(5);
    expect(result.total).toBe(5);
  });

  it('accumulates scores across categories', () => {
    const questions = [twkQuestion, tiuQuestion, tkpQuestion];
    const answers = { 0: 1, 1: 2, 2: 2 }; // all correct: TWK=5, TIU=5, TKP=5
    const result = calculateScoring(questions, answers);
    expect(result).toEqual({ TWK: 5, TIU: 5, TKP: 5, total: 15 });
  });

  it('total equals sum of category scores', () => {
    const questions = [twkQuestion, tiuQuestion, tkpQuestion];
    const answers = { 0: 1, 1: 2, 2: 0 };
    const result = calculateScoring(questions, answers);
    expect(result.total).toBe(result.TWK + result.TIU + result.TKP);
  });
});

describe('formatTime', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds under 60 correctly', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(30)).toBe('00:30');
    expect(formatTime(59)).toBe('00:59');
  });

  it('formats exact minutes correctly', () => {
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(120)).toBe('02:00');
    expect(formatTime(100 * 60)).toBe('100:00');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(125)).toBe('02:05');
  });
});

describe('formatCurrency', () => {
  it('formats 0 as Rp 0', () => {
    expect(formatCurrency(0)).toBe('Rp 0');
  });

  it('formats positive amounts with thousand separators', () => {
    expect(formatCurrency(45000)).toBe('Rp 45.000');
    expect(formatCurrency(90000)).toBe('Rp 90.000');
    expect(formatCurrency(145000)).toBe('Rp 145.000');
    expect(formatCurrency(1000000)).toBe('Rp 1.000.000');
  });
});
