import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import type { Package, BankAccount, LogoConfig } from '@/lib/types';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      packages: useAppStore.getState().packages,
      banks: useAppStore.getState().banks,
      questions: useAppStore.getState().questions,
      packageBanks: useAppStore.getState().packageBanks,
      trialSet: useAppStore.getState().trialSet,
      logoConfig: useAppStore.getState().logoConfig,
      attemptHistory: [],
    });
  });

  it('setPackages updates packages', () => {
    const newPackages: Package[] = [
      { id: 999, name: 'New Package', description: 'Test', price: 50000, isTrial: false, includesVideoPembelajaran: false, startDate: null, endDate: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ];
    useAppStore.getState().setPackages(newPackages);
    expect(useAppStore.getState().packages).toEqual(newPackages);
  });

  it('setBanks updates banks', () => {
    const newBanks: BankAccount[] = [
      { id: 999, bankName: 'BSI', accountNumber: '9999999999', accountHolder: 'Test', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ];
    useAppStore.getState().setBanks(newBanks);
    expect(useAppStore.getState().banks).toEqual(newBanks);
  });

  it('setLogoConfig updates logoConfig', () => {
    const state = useAppStore.getState();
    const baseConfig = state.logoConfig;
    const newConfig: LogoConfig = {
      ...baseConfig,
      namaApp: 'New App',
      tagline: 'New Tagline',
    };
    useAppStore.getState().setLogoConfig(newConfig);
    expect(useAppStore.getState().logoConfig.namaApp).toBe('New App');
  });

  it('setLogoConfig accepts a functional updater', () => {
    const updater = (prev: LogoConfig) => ({ ...prev, namaApp: 'Updated via Fn' });
    useAppStore.getState().setLogoConfig(updater);
    expect(useAppStore.getState().logoConfig.namaApp).toBe('Updated via Fn');
  });

  it('resetToDefaults restores initial state', () => {
    // Modify state
    useAppStore.getState().setPackages([]);

    // Reset
    useAppStore.getState().resetToDefaults();

    // Packages and banks should be restored
    expect(useAppStore.getState().packages.length).toBeGreaterThan(0);
    expect(useAppStore.getState().banks.length).toBeGreaterThan(0);
  });

  it('trialSet has 10 questions by default', () => {
    expect(useAppStore.getState().trialSet.questions.length).toBe(10);
  });

  it('packageBanks initializes empty (loaded from API)', () => {
    const banks = useAppStore.getState().packageBanks;
    expect(banks).toEqual({});
    // Verify setter works
    useAppStore.getState().setPackageBanks({ '1': [], '2': [] });
    expect(Object.keys(useAppStore.getState().packageBanks).length).toBe(2);
  });
});
