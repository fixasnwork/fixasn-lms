'use client';

import { Card } from '@/components/ui';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Rizki A.',
      role: 'Kemenkes RI',
      text: 'Soal-soal tryoutnya mirip banget sama ujian asli. Skor TWK saya naik dari 85 jadi 130 setelah rutin tryout di sini!',
    },
    {
      name: 'Maya S.',
      role: 'Kemendikbud RI',
      text: 'Video materinya sangat terstruktur. Modul PDF-nya membantu banget untuk belajar offline. Worth it banget!',
    },
    {
      name: 'Doni P.',
      role: 'BPS Jawa Timur',
      text: 'Fitur ranking bikin saya terpacu. Tahu posisi nasional sendiri sangat memotivasi untuk terus berlatih!',
    },
  ];

  return (
    <section className="py-12 px-5 bg-white w-full box-border">
      <div className="max-w-[1180px] mx-auto">
        <h2 className="text-center text-4xl font-black text-[#1B3A6B] mb-10">
          Mereka yang Sudah Lolos 🎉
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5.5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-md border border-gray-100"
            >
              <div className="text-5 mb-2.5">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4.5 italic">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-white font-extrabold flex-shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1B3A6B]">{t.name}</div>
                  <div className="text-xs text-gray-400">ASN {t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
