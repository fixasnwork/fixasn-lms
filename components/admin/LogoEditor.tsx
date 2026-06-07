'use client';

import { useState, useEffect } from 'react';
import type { LogoConfig } from '@/lib/types';
import { Logo, Button, Card } from '@/components/ui';
import ImageUpload from '@/components/admin/ImageUpload';

interface LogoEditorProps {
  logoConfig: LogoConfig;
  setLogoConfig: (config: LogoConfig | ((prev: LogoConfig) => LogoConfig)) => void;
  onSave?: () => Promise<boolean>;
}

export default function LogoEditor({ logoConfig, setLogoConfig, onSave }: LogoEditorProps) {
  const [draft, setDraft] = useState<LogoConfig>({ ...logoConfig });

  // Sync draft when logoConfig prop changes (e.g., after fetchLogoConfig from DB)
  useEffect(() => {
    setDraft({ ...logoConfig });
  }, [logoConfig]);

  const update = (field: keyof LogoConfig, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setLogoConfig((prev) => ({ ...prev, ...draft }));
    if (onSave) {
      const ok = await onSave();
      alert(ok ? '✅ Konfigurasi berhasil disimpan!' : '❌ Gagal menyimpan konfigurasi.');
    }
  };

  const presets = [
    { name: 'FIX ASN', tag: 'Sukses Loloscpns', c1: '#1B3A6B', c2: '#F5C518' },
    { name: 'Latihan Soal', tag: 'Belajar smarter', c1: '#065F46', c2: '#34D399' },
    { name: 'Tryout Pro', tag: 'SKD Experts', c1: '#7C3AED', c2: '#F5C518' },
  ];

  return (
    <Card className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h3 className="font-extrabold text-base text-[#1B3A6B]">🎨 Logo & Branding</h3>
        <Button variant="primary" size="sm" onClick={save}>
          💾 Simpan Perubahan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiri: editor form */}
        <div className="flex flex-col gap-4">
          {/* Nama & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Nama Aplikasi</label>
              <input
                value={draft.namaApp}
                onChange={(e) => update('namaApp', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb mb-1">Tagline</label>
              <input
                value={draft.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Warna Nama</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={draft.warnaNama}
                  onChange={(e) => update('warnaNama', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <input
                  value={draft.warnaNama}
                  onChange={(e) => update('warnaNama', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Warna Tagline</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={draft.warnaTag}
                  onChange={(e) => update('warnaTag', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <input
                  value={draft.warnaTag}
                  onChange={(e) => update('warnaTag', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Warna Gradient Kiri</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={draft.warnaKiri}
                  onChange={(e) => update('warnaKiri', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <input
                  value={draft.warnaKiri}
                  onChange={(e) => update('warnaKiri', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Warna Gradient Kanan</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={draft.warnaKanan}
                  onChange={(e) => update('warnaKanan', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <input
                  value={draft.warnaKanan}
                  onChange={(e) => update('warnaKanan', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Warna Inner (Dot)</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={draft.warnaInner}
                  onChange={(e) => update('warnaInner', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <input
                  value={draft.warnaInner}
                  onChange={(e) => update('warnaInner', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Custom Image</label>
              <input
                type="checkbox"
                checked={!!draft.customImg}
                onChange={(e) => update('customImg', e.target.checked ? '' : '')}
                className="w-4 h-4"
              />
            </div>
          </div>

          {/* Custom image upload */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <label className="text-xs font-bold text-gray-500 block mb-2">🖼️ Custom Logo Image (opsional)</label>
            <ImageUpload
              value={draft.customImg || ''}
              onChange={(v) => update('customImg', v)}
            />
          </div>

          {/* Hero section */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              📸 Hero Landing Page
            </p>
            <div className="flex flex-col gap-2">
              <ImageUpload
                value={draft.heroImg || ''}
                onChange={(v) => update('heroImg', v)}
                label="Foto Hero"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Caption</label>
                  <input
                    value={draft.heroCaption || ''}
                    onChange={(e) => update('heroCaption', e.target.value)}
                    placeholder="Ribuan ASN sudah lulus"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Sub Caption</label>
                  <input
                    value={draft.heroSubCaption || ''}
                    onChange={(e) => update('heroSubCaption', e.target.value)}
                    placeholder="Bergabung dan wujudkan..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kanan: preview */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            👁 Preview Live
          </p>

          {/* Preview navbar */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">
              Navbar
            </p>
            <Logo size="sm" cfg={draft} />
          </div>

          {/* Preview medium */}
          <div className="bg-[#F8FAFF] border border-gray-100 rounded-xl p-5 mb-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">
              Hero / Dashboard
            </p>
            <Logo size="md" cfg={draft} />
          </div>

          {/* Preview large on dark */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'linear-gradient(135deg,#0C1E45,#1B3A6B)' }}
          >
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mb-3">
              Dark background
            </p>
            <Logo size="lg" cfg={draft} />
          </div>

          {/* Presets */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              🎨 Quick Presets
            </p>
            <div className="flex gap-2 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      namaApp: p.name,
                      tagline: p.tag,
                      warnaNama: p.c1,
                      warnaKiri: p.c2,
                      warnaKanan: p.c1,
                      warnaTag: p.c2,
                    }))
                  }
                  className="px-3 py-1.5 border border-gray-200 rounded-full text-xs font-bold bg-white cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
