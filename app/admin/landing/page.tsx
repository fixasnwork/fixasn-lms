'use client';

import { useAppStore } from '@/store/useAppStore';
import LogoEditor from '@/components/admin/LogoEditor';
import { Button, Card } from '@/components/ui';

export default function LandingPage() {
  const { logoConfig, setLogoConfig } = useAppStore();

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">🌐 Kelola Landing Page</h2>
      <p className="text-gray-400 text-sm mb-6">
        Ubah logo, nama aplikasi, dan tampilan branding.
      </p>

      {/* Logo Editor */}
      <LogoEditor logoConfig={logoConfig} setLogoConfig={setLogoConfig} />

      {/* Other sections placeholder */}
      <h3 className="font-extrabold text-base text-[#1B3A6B] mb-4">📄 Section Lainnya</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {[
          { icon: '🦸', title: 'Hero Section', desc: 'Judul, subjudul, CTA, statistik' },
          { icon: '📋', title: 'Struktur SKD', desc: 'Info soal TWK, TIU, TKP' },
          { icon: '⭐', title: 'Testimoni', desc: 'Ulasan peserta yang lolos' },
          { icon: '📞', title: 'Kontak & WA', desc: 'Nomor WA, email, sosmed' },
          { icon: '🎉', title: 'Banner Promo', desc: 'Promo dan pengumuman khusus' },
        ].map((s, i) => (
          <Card key={i} hover className="flex items-center gap-3.5 p-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
              {s.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-sm text-[#1B3A6B] mb-0.5">{s.title}</h4>
              <p className="text-xs text-gray-400 m-0">{s.desc}</p>
            </div>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}