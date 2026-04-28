import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import type { Package, BankAccount, LogoConfig } from '@/lib/types';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      packages: useAppStore.getState().packages,
      banks: useAppStore.getState().banks,
      questions: useAppStore.getState().questions,
      durationMin: 100,
      tryoutSets: useAppStore.getState().tryoutSets,
      packageBanks: useAppStore.getState().packageBanks,
      trialSet: useAppStore.getState().trialSet,
      logoConfig: useAppStore.getState().logoConfig,
    });
  });

  it('has correct initial duration of 100 minutes', () => {
    expect(useAppStore.getState().durationMin).toBe(100);
  });

  it('setPackages updates packages', () => {
    const newPackages: Package[] = [
      { id: 'new', name: 'New Package', tryouts: 5, price: 50000, desc: 'Test', popular: false, video: false, comingSoon: false },
    ];
    useAppStore.getState().setPackages(newPackages);
    expect(useAppStore.getState().packages).toEqual(newPackages);
  });

  it('setBanks updates banks', () => {
    const newBanks: BankAccount[] = [
      { id: 'new', bank: 'BSI', norek: '9999999999', atas: 'Test' },
    ];
    useAppStore.getState().setBanks(newBanks);
    expect(useAppStore.getState().banks).toEqual(newBanks);
  });

  it('setDurationMin updates duration', () => {
    useAppStore.getState().setDurationMin(90);
    expect(useAppStore.getState().durationMin).toBe(90);
  });

  it('setLogoConfig updates logoConfig', () => {
    const newConfig: LogoConfig = {
      namaApp: 'New App',
      tagline: 'New Tagline',
      warnaNama: '#000000',
      warnaTag: '#111111',
      warnaKiri: '#222222',
      warnaKanan: '#333333',
      warnaInner: '#444444',
      customImg: null,
      heroImg: 'https://example.com/hero.jpg',
      heroCaption: 'Caption',
      heroSubCaption: 'Sub',
      heroTitle1: 'Title1',
      heroTitle2: 'Title2',
      heroTitle3: 'Title3',
      heroDesc: 'Desc',
      skdTitle: 'SKD',
      skdSubtitle: 'SKD Sub',
      paketTitle: 'Paket',
      paketSubtitle: 'Sub',
      ctaTitle: 'CTA',
      stat1Val: '100',
      stat1Label: 'Label',
      stat2Val: '200',
      stat2Label: 'Label',
      stat3Val: '300',
      stat3Label: 'Label',
    };
    useAppStore.getState().setLogoConfig(newConfig);
    expect(useAppStore.getState().logoConfig.namaApp).toBe('New App');
    expect(useAppStore.getState().logoConfig.heroImg).toBe('https://example.com/hero.jpg');
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

    // Packages and banks should be restored (durationMin is NOT reset by resetToDefaults)
    expect(useAppStore.getState().packages.length).toBeGreaterThan(0);
    expect(useAppStore.getState().banks.length).toBeGreaterThan(0);
  });

  it('trialSet has 10 questions by default', () => {
    expect(useAppStore.getState().trialSet.questions.length).toBe(10);
  });

  it('packageBanks has entries for each package', () => {
    const banks = useAppStore.getState().packageBanks;
    expect(Object.keys(banks).length).toBeGreaterThan(0);
    expect(banks['p1']).toBeDefined();
    expect(banks['p2']).toBeDefined();
    expect(banks['p3']).toBeDefined();
  });
});
