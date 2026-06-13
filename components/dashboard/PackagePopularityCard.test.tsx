import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PackagePopularityCard from './PackagePopularityCard';
import type { PackagePopularityItem } from '@/lib/types';

const dummyItems: PackagePopularityItem[] = [
  { packageId: 1, packageName: 'Paket Premium', purchaseCount: 50, purchaseShare: 50 },
  { packageId: 2, packageName: 'Paket Basic', purchaseCount: 30, purchaseShare: 30 },
  { packageId: 3, packageName: 'Paket Pro', purchaseCount: 20, purchaseShare: 20 },
];

describe('PackagePopularityCard', () => {
  it('renders card title', () => {
    render(<PackagePopularityCard items={dummyItems} />);
    expect(screen.getByText('📦 Popularitas Paket')).toBeDefined();
  });

  it('renders package names and percentages', () => {
    render(<PackagePopularityCard items={dummyItems} />);
    expect(screen.getByText('Paket Premium')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('Paket Basic')).toBeDefined();
    expect(screen.getByText('30%')).toBeDefined();
    expect(screen.getByText('Paket Pro')).toBeDefined();
    expect(screen.getByText('20%')).toBeDefined();
  });

  it('does not show purchase counts', () => {
    render(<PackagePopularityCard items={dummyItems} />);
    expect(screen.queryByText('50')).toBeNull();
    expect(screen.queryByText('30')).toBeNull();
    expect(screen.queryByText('20')).toBeNull();
  });

  it('shows items sorted by purchaseCount descending', () => {
    render(<PackagePopularityCard items={dummyItems} />);
    const rows = screen.getAllByText(/Paket\s/);
    expect(rows[0].textContent).toBe('Paket Premium');
    expect(rows[1].textContent).toBe('Paket Basic');
    expect(rows[2].textContent).toBe('Paket Pro');
  });

  it('shows empty state when all items have zero purchaseCount', () => {
    const emptyItems: PackagePopularityItem[] = [
      { packageId: 1, packageName: 'Paket A', purchaseCount: 0, purchaseShare: 0 },
      { packageId: 2, packageName: 'Paket B', purchaseCount: 0, purchaseShare: 0 },
    ];
    render(<PackagePopularityCard items={emptyItems} />);
    expect(screen.getByText('Belum ada data popularitas paket')).toBeDefined();
  });

  it('shows empty state when items array is empty', () => {
    render(<PackagePopularityCard items={[]} />);
    expect(screen.getByText('Belum ada data popularitas paket')).toBeDefined();
  });
});
