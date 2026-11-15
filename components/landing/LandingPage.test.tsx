import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from './LandingPage';
import { useAppStore } from '@/store/useAppStore';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({ default: () => null }));

const originalState = useAppStore.getState();
const mockFetch = vi.fn();
let queryClient: QueryClient;

function renderLanding() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LandingPage />
    </QueryClientProvider>,
  );
}

describe('LandingPage packages', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    useAppStore.setState({
      fetchLogoConfig: vi.fn().mockResolvedValue(undefined),
      packages: [{ ...originalState.packages[0], name: 'Paket lokal lama' }],
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    useAppStore.setState(originalState);
    vi.unstubAllGlobals();
  });

  it('loads API packages instead of local defaults and preserves availability filtering', async () => {
    const pkg = {
      ...originalState.packages[0], id: 123, name: 'Paket database terbaru',
      price: 456000, isTrial: false, startDate: '2000-01-01T00:00:00.000Z', endDate: null,
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ packages: [
      pkg,
      { ...pkg, id: 124, name: 'Paket trial tersembunyi', isTrial: true },
      { ...pkg, id: 125, name: 'Paket kedaluwarsa', endDate: '2000-01-01T00:00:00.000Z' },
    ] }) });
    renderLanding();

    expect(await screen.findByText('Paket database terbaru')).toBeInTheDocument();
    expect(screen.getByText('Rp 456.000')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith('/api/packages', { cache: 'no-store' });
    expect(screen.queryByText('Paket lokal lama')).not.toBeInTheDocument();
    expect(screen.queryByText('Paket trial tersembunyi')).not.toBeInTheDocument();
    expect(screen.queryByText('Paket kedaluwarsa')).not.toBeInTheDocument();
  });

  it('shows loading without displaying local packages', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderLanding();
    expect(screen.getByRole('status')).toHaveTextContent('Memuat paket...');
    expect(screen.queryByText('Paket lokal lama')).not.toBeInTheDocument();
  });

  it('shows an empty state when the database has no packages', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ packages: [] }) });
    renderLanding();
    expect(await screen.findByText('Belum ada paket yang tersedia.')).toBeInTheDocument();
    expect(screen.queryByText('Paket lokal lama')).not.toBeInTheDocument();
  });

  it('shows an error instead of local packages when the API fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    renderLanding();
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat paket.');
    expect(screen.queryByText('Paket lokal lama')).not.toBeInTheDocument();
  });
});
