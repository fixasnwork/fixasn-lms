import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FinishedAttemptCard from './FinishedAttemptCard';

describe('FinishedAttemptCard', () => {
  const defaultProps = {
    attemptId: 'att-123',
    tryoutName: 'Tryout SKD 1',
    packageName: 'Paket Premium',
    finishedAt: '2026-06-14T10:00:00.000Z',
    totalScore: 320,
    twkScore: 75,
    tiuScore: 85,
    tkpScore: 160,
    onView: vi.fn(),
  };

  it('renders tryout name, package name, and formatted date', () => {
    render(<FinishedAttemptCard {...defaultProps} />);
    expect(screen.getByText('Tryout SKD 1')).toBeInTheDocument();
    expect(screen.getByText(/Paket Premium/)).toBeInTheDocument();
    // "14 Juni 2026" is the id-ID locale format
    expect(screen.getByText(/14 Juni 2026/)).toBeInTheDocument();
  });

  it('renders score breakdown', () => {
    render(<FinishedAttemptCard {...defaultProps} />);
    expect(screen.getByText(/TWK: 75/)).toBeInTheDocument();
    expect(screen.getByText(/TIU: 85/)).toBeInTheDocument();
    expect(screen.getByText(/TKP: 160/)).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
  });

  it('calls onView with attemptId when Lihat Pembahasan is clicked', () => {
    const onView = vi.fn();
    render(<FinishedAttemptCard {...defaultProps} onView={onView} />);
    fireEvent.click(screen.getByText('Lihat Pembahasan'));
    expect(onView).toHaveBeenCalledWith('att-123');
  });

  it('renders a single button with Lihat Pembahasan text', () => {
    render(<FinishedAttemptCard {...defaultProps} />);
    expect(screen.getByText('Lihat Pembahasan')).toBeInTheDocument();
  });

  it('renders full-width (w-full) card container', () => {
    const { container } = render(<FinishedAttemptCard {...defaultProps} />);
    const card = container.firstElementChild;
    expect(card?.className).toContain('w-full');
  });
});
