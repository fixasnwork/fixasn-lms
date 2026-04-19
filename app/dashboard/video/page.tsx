'use client';

import { Card } from '@/components/ui';

export default function VideoPage() {
  const categories = [
    {
      cat: 'TWK',
      color: '#2563EB',
      bg: '#EFF6FF',
      videos: [
        { title: 'Pengantar TWK', duration: '35:00', views: 15420 },
        { title: 'Materi Inti TWK #1', duration: '42:00', views: 12300 },
        { title: 'Materi Inti TWK #2', duration: '49:00', views: 11200 },
        { title: 'Soal & Pembahasan TWK', duration: '56:00', views: 9800 },
      ],
    },
    {
      cat: 'TIU',
      color: '#7C3AED',
      bg: '#F5F3FF',
      videos: [
        { title: 'Pengantar TIU', duration: '35:00', views: 14400 },
        { title: 'Materi Inti TIU #1', duration: '42:00', views: 11800 },
        { title: 'Materi Inti TIU #2', duration: '49:00', views: 10500 },
        { title: 'Soal & Pembahasan TIU', duration: '56:00', views: 8900 },
      ],
    },
    {
      cat: 'TKP',
      color: '#D97706',
      bg: '#FFFBEB',
      videos: [
        { title: 'Pengantar TKP', duration: '35:00', views: 13200 },
        { title: 'Materi Inti TKP #1', duration: '42:00', views: 10900 },
        { title: 'Materi Inti TKP #2', duration: '49:00', views: 9400 },
        { title: 'Soal & Pembahasan TKP', duration: '56:00', views: 8100 },
      ],
    },
  ];

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">🎬 Video Belajar</h2>
      <p className="text-gray-400 text-sm mb-6">
        Materi lengkap TWK, TIU, TKP + Modul PDF download
      </p>

      {/* Video package banner */}
      <Card
        className="mb-6 border-2 border-dashed border-amber-300 bg-amber-50"
        style={{ borderColor: '#F5C518' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-400 flex items-center justify-center text-2xl flex-shrink-0">
              🎬
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-lg text-[#1B3A6B]">
                  Paket Video Belajar Komplit
                </h3>
                <span className="bg-amber-200 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  🕐 Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-500 m-0">
                Video pembelajaran sedang dalam tahap produksi. Segera hadir!
              </p>
            </div>
          </div>
          <div className="bg-amber-100 text-amber-600 px-4 py-2 rounded-full font-bold text-sm">
            🕐 Segera Hadir
          </div>
        </div>
      </Card>

      {/* Video lists by category */}
      {categories.map(({ cat, color, bg, videos }) => (
        <div key={cat} className="mb-6">
          <h3
            className="font-extrabold text-base mb-3"
            style={{ color, background: bg, display: 'inline-block', padding: '4px 14px', borderRadius: 8 }}
          >
            {cat}
          </h3>
          <div className="flex flex-col gap-2.5">
            {videos.map((v, i) => (
              <Card key={i} className="p-3.5 flex items-center gap-3.5">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${color},${color}88)` }}
                >
                  ▶️
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-800">{v.title}</div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-400">⏱ {v.duration}</span>
                    <span className="text-xs text-gray-400">
                      👁 {v.views.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                    📥 PDF
                  </button>
                  <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                    ▶️ Mulai
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}