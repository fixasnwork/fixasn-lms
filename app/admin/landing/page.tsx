'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import LogoEditor from '@/components/admin/LogoEditor';
import { Button, Card, Modal } from '@/components/ui';
import ImageUpload from '@/components/admin/ImageUpload';
import type { LogoConfig } from '@/lib/types';

type SectionKey = 'hero' | 'skd' | 'testimoni' | 'kontak' | 'promo';

const SECTIONS: { key: SectionKey; icon: string; title: string; desc: string }[] = [
  { key: 'hero', icon: '🦸', title: 'Hero Section', desc: 'Judul, subjudul, CTA, statistik' },
  { key: 'skd', icon: '📋', title: 'Struktur SKD', desc: 'Info soal TWK, TIU, TKP' },
  { key: 'testimoni', icon: '⭐', title: 'Testimoni', desc: 'Ulasan peserta yang lolos' },
  { key: 'kontak', icon: '📞', title: 'Kontak & WA', desc: 'Nomor WA, email, sosmed' },
  { key: 'promo', icon: '🎉', title: 'Banner Promo', desc: 'Promo dan pengumuman khusus' },
];

const field = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
  <div>
    <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    />
  </div>
);

export default function AdminLandingPage() {
  const { logoConfig, setLogoConfig, syncLogoConfig, fetchLogoConfig } = useAppStore();
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<Partial<LogoConfig>>({});
  const [saving, setSaving] = useState(false);

  // Load DB-stored config on mount (overrides hardcoded defaults)
  useEffect(() => {
    fetchLogoConfig();
  }, [fetchLogoConfig]);

  const openEditor = (section: SectionKey) => {
    setDraft({ ...logoConfig });
    setEditingSection(section);
  };

  const closeEditor = () => {
    setEditingSection(null);
    setDraft({});
  };

  const updateField = (f: keyof LogoConfig, value: string) => {
    setDraft((prev) => ({ ...prev, [f]: value }));
  };

  const saveSection = async () => {
    setLogoConfig((prev) => ({ ...prev, ...draft }));
    setSaving(true);
    const ok = await syncLogoConfig();
    setSaving(false);
    alert(ok ? '✅ Konfigurasi berhasil disimpan!' : '❌ Gagal menyimpan konfigurasi.');
    closeEditor();
  };

  const renderForm = () => {
    if (!editingSection) return null;

    switch (editingSection) {
      case 'hero':
        return (
          <div className="flex flex-col gap-3">
            {field('Judul Baris 1', draft.heroTitle1 || '', (v) => updateField('heroTitle1', v), 'Lolos CPNS')}
            {field('Judul Baris 2', draft.heroTitle2 || '', (v) => updateField('heroTitle2', v), 'Bukan Sekadar')}
            {field('Judul Baris 3', draft.heroTitle3 || '', (v) => updateField('heroTitle3', v), 'Impian!')}
            {field('Deskripsi Hero', draft.heroDesc || '', (v) => updateField('heroDesc', v), 'Tryout SKD paling mirip...')}
            {field('Caption Foto', draft.heroCaption || '', (v) => updateField('heroCaption', v), 'Ribuan ASN sudah lulus')}
            {field('Sub Caption', draft.heroSubCaption || '', (v) => updateField('heroSubCaption', v), 'Bergabung dan wujudkan...')}
            <ImageUpload value={draft.heroImg || ''} onChange={(v) => updateField('heroImg', v)} label="Foto Hero" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field('Stat 1 Nilai', draft.stat1Val || '', (v) => updateField('stat1Val', v), '15.000+')}
              {field('Stat 1 Label', draft.stat1Label || '', (v) => updateField('stat1Label', v), 'Peserta Aktif')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field('Stat 2 Nilai', draft.stat2Val || '', (v) => updateField('stat2Val', v), '98%')}
              {field('Stat 2 Label', draft.stat2Label || '', (v) => updateField('stat2Label', v), 'Tingkat Kelulusan')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field('Stat 3 Nilai', draft.stat3Val || '', (v) => updateField('stat3Val', v), '110')}
              {field('Stat 3 Label', draft.stat3Label || '', (v) => updateField('stat3Label', v), 'Soal per Tryout')}
            </div>
          </div>
        );

      case 'skd':
        return (
          <div className="flex flex-col gap-3">
            {field('Judul SKD', draft.skdTitle || '', (v) => updateField('skdTitle', v), 'Materi Tryout SKD')}
            {field('Subjudul SKD', draft.skdSubtitle || '', (v) => updateField('skdSubtitle', v), 'Persis seperti ujian CPNS aslinya...')}
          </div>
        );

      case 'testimoni':
        return (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-gray-100 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Testimoni {n}</p>
                {field(
                  'Nama',
                  (draft[`testimonial${n}Name` as keyof LogoConfig] as string) || '',
                  (v) => updateField(`testimonial${n}Name` as keyof LogoConfig, v),
                  'Rizki A.'
                )}
                {field(
                  'Instansi',
                  (draft[`testimonial${n}Role` as keyof LogoConfig] as string) || '',
                  (v) => updateField(`testimonial${n}Role` as keyof LogoConfig, v),
                  'Kemenkes RI'
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Ulasan</label>
                  <textarea
                    value={(draft[`testimonial${n}Text` as keyof LogoConfig] as string) || ''}
                    onChange={(e) => updateField(`testimonial${n}Text` as keyof LogoConfig, e.target.value)}
                    rows={3}
                    placeholder="Soal-soal tryoutnya mirip banget..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 'kontak':
        return (
          <div className="flex flex-col gap-3">
            {field('Nomor WhatsApp', draft.contactWA || '', (v) => updateField('contactWA', v), '+62 898-7608-379')}
            {field('Email', draft.contactEmail || '', (v) => updateField('contactEmail', v), 'info@fixasn.id')}
          </div>
        );

      case 'promo':
        return (
          <div className="flex flex-col gap-3">
            {field('Teks Banner Promo', draft.promoBannerText || '', (v) => updateField('promoBannerText', v), 'Platform Tryout CPNS Terpercaya #1')}
            {field('Judul CTA', draft.ctaTitle || '', (v) => updateField('ctaTitle', v), 'Siap Wujudkan Impianmu jadi ASN?')}
            {field('Subjudul CTA', draft.ctaSubtitle || '', (v) => updateField('ctaSubtitle', v), 'Bergabung sekarang, mulai tryout hari ini juga!')}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <h2 className="font-black text-xl sm:text-2xl text-[#1B3A6B] mb-1">🌐 Kelola Landing Page</h2>
      <p className="text-gray-400 text-sm mb-6">
        Ubah logo, nama aplikasi, dan tampilan branding.
      </p>

      {/* Logo Editor */}
      <LogoEditor key={JSON.stringify(logoConfig)} logoConfig={logoConfig} setLogoConfig={setLogoConfig} onSave={syncLogoConfig} />

      {/* Section Editors */}
      <h3 className="font-extrabold text-base text-[#1B3A6B] mb-4">📄 Section Lainnya</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {SECTIONS.map((s) => (
          <Card key={s.key} hover className="flex items-center gap-3.5 p-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
              {s.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-sm text-[#1B3A6B] mb-0.5">{s.title}</h4>
              <p className="text-xs text-gray-400 m-0">{s.desc}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openEditor(s.key)}>
              Edit
            </Button>
          </Card>
        ))}
      </div>

      {/* Section Editor Modal */}
      <Modal
        open={editingSection !== null}
        onClose={closeEditor}
        title={SECTIONS.find((s) => s.key === editingSection)?.title || 'Edit Section'}
        width={600}
      >
        {renderForm()}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-end mt-5 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={closeEditor}>
            Batal
          </Button>
          <Button variant="primary" onClick={saveSection} disabled={saving}>
            {saving ? '⏳ Menyimpan…' : '💾 Simpan Perubahan'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
