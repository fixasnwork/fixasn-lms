'use client';

import { useState } from 'react';
import type { Package, BankAccount } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card } from '@/components/ui';

export default function SettingsPage() {
  const { packages, banks, setPackages, setBanks } = useAppStore();

  const [adminPackages, setAdminPackages] = useState<Package[]>(
    packages.map((p) => ({ ...p }))
  );
  const [adminBanks, setAdminBanks] = useState<BankAccount[]>(
    banks.map((b) => ({ ...b }))
  );
  const [savedMsg, setSavedMsg] = useState('');

  const updatePkg = (id: number, field: string, val: string | number | boolean) => {
    setAdminPackages((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]:
                field === 'price' ? Number(val) : val,
            }
          : p
      )
    );
  };

  const updateBank = (id: number, field: string, val: string) => {
    setAdminBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
    );
  };

  let _nextId = 1;
  const addBank = () => {
    setAdminBanks((prev) => [
      ...prev,
      { id: -_nextId--, bankName: 'Bank Baru', accountNumber: '', accountHolder: 'CV. FIX ASN INDONESIA', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
  };

  const removeBank = (id: number) =>
    setAdminBanks((prev) => prev.filter((b) => b.id !== id));

  const savePackages = () => {
    setPackages(adminPackages.map((p) => ({ ...p })));
    setSavedMsg('✅ Paket berhasil disimpan!');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const saveBanks = () => {
    setBanks(adminBanks.map((b) => ({ ...b })));
    setSavedMsg('✅ Rekening berhasil disimpan!');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">⚙️ Pengaturan</h2>
      <p className="text-gray-400 text-sm mb-6">
        Kelola harga paket, jumlah tryout, dan nomor rekening pembayaran.
      </p>

      {savedMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 font-bold text-green-700 text-sm">
          {savedMsg}
        </div>
      )}

      {/* Packages */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-[#1B3A6B]">📦 Paket Tryout</h3>
          <Button variant="primary" size="sm" onClick={savePackages}>
            💾 Simpan Semua
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {adminPackages
            .filter((p) => p.isActive)
            .map((pkg) => (
              <div
                key={pkg.id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50"
              >
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Nama Paket
                  </label>
                  <input
                    value={pkg.name}
                    onChange={(e) => updatePkg(pkg.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
                  />
                </div>
                {/* Price */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    value={pkg.price}
                    min={0}
                    onChange={(e) => updatePkg(pkg.id, 'price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                {/* Active toggle */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Opsi
                  </label>
                  <div className="flex gap-2 items-center h-[42px]">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.isActive}
                        onChange={(e) => updatePkg(pkg.id, 'isActive', e.target.checked)}
                        className="w-4 h-4"
                      />
                      Aktif
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.isTrial}
                        onChange={(e) => updatePkg(pkg.id, 'isTrial', e.target.checked)}
                        className="w-4 h-4"
                      />
                      Trial
                    </label>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-[#1B3A6B]">🏦 Rekening Pembayaran</h3>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={saveBanks}>
              💾 Simpan Semua
            </Button>
            <Button variant="gold" size="sm" onClick={addBank}>
              + Tambah Rekening
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {adminBanks.map((b) => (
            <div
              key={b.id}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50"
            >
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  Nama Bank
                </label>
                <input
                  value={b.bankName}
                  onChange={(e) => updateBank(b.id, 'bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  Nomor Rekening
                </label>
                <input
                  value={b.accountNumber}
                  onChange={(e) => updateBank(b.id, 'accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Atas Nama
                  </label>
                  <input
                    value={b.accountHolder}
                    onChange={(e) => updateBank(b.id, 'accountHolder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeBank(b.id)}
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}