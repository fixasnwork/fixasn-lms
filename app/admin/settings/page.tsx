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

  const updatePkg = (id: string, field: string, val: string | number | boolean) => {
    setAdminPackages((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]:
                field === 'price' || field === 'tryouts' ? Number(val) : val,
            }
          : p
      )
    );
  };

  const updateBank = (id: string, field: string, val: string) => {
    setAdminBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
    );
  };

  const addBank = () => {
    const newId = 'b' + Date.now();
    setAdminBanks((prev) => [
      ...prev,
      { id: newId, bank: 'Bank Baru', norek: '', atas: 'CV. FIX ASN INDONESIA' },
    ]);
  };

  const removeBank = (id: string) =>
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
            .filter((p) => !p.video)
            .map((pkg) => (
              <div
                key={pkg.id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50"
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
                {/* Tryouts */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Jumlah Tryout
                  </label>
                  <input
                    type="number"
                    value={pkg.tryouts}
                    min={1}
                    max={50}
                    onChange={(e) => updatePkg(pkg.id, 'tryouts', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
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
                {/* Popular toggle */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Opsi
                  </label>
                  <div className="flex gap-2 items-center h-[42px]">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.popular}
                        onChange={(e) => updatePkg(pkg.id, 'popular', e.target.checked)}
                        className="w-4 h-4"
                      />
                      🔥 Populer
                    </label>
                  </div>
                </div>
              </div>
            ))}

          {/* Video package */}
          {adminPackages
            .filter((p) => p.video)
            .map((pkg) => (
              <div
                key={pkg.id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border border-gray-100 rounded-xl bg-amber-50"
              >
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Nama Paket
                  </label>
                  <input
                    value={pkg.name}
                    onChange={(e) => updatePkg(pkg.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    value={pkg.price}
                    min={0}
                    onChange={(e) => updatePkg(pkg.id, 'price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Coming Soon
                  </label>
                  <div className="flex items-center h-[42px]">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.comingSoon}
                        onChange={(e) =>
                          updatePkg(pkg.id, 'comingSoon', e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      🕐 Aktifkan
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-xs bg-amber-200 text-amber-700 px-3 py-1.5 rounded-full font-bold">
                    🎬 Video Belajar
                  </span>
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
                  value={b.bank}
                  onChange={(e) => updateBank(b.id, 'bank', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  Nomor Rekening
                </label>
                <input
                  value={b.norek}
                  onChange={(e) => updateBank(b.id, 'norek', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Atas Nama
                  </label>
                  <input
                    value={b.atas}
                    onChange={(e) => updateBank(b.id, 'atas', e.target.value)}
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