'use client';

import type { LogoConfig } from '@/lib/types';

interface TestimonialsSectionProps {
  logoConfig: LogoConfig;
}

export function TestimonialsSection({ logoConfig }: TestimonialsSectionProps) {
  const testimonials = [
    { name: logoConfig.testimonial1Name || 'Rizki A.', role: logoConfig.testimonial1Role || 'Kemenkes RI', text: logoConfig.testimonial1Text || 'Soal-soal tryoutnya mirip banget sama ujian asli. Skor TWK saya naik dari 85 jadi 130 setelah rutin tryout di sini!' },
    { name: logoConfig.testimonial2Name || 'Maya S.', role: logoConfig.testimonial2Role || 'Kemendikbud RI', text: logoConfig.testimonial2Text || 'Video materinya sangat terstruktur. Modul PDF-nya membantu banget untuk belajar offline. Worth it banget!' },
    { name: logoConfig.testimonial3Name || 'Doni P.', role: logoConfig.testimonial3Role || 'BPS Jawa Timur', text: logoConfig.testimonial3Text || 'Fitur ranking bikin saya terpacu. Tahu posisi nasional sendiri sangat memotivasi untuk terus berlatih!' },
  ];

  return (
    <section className="py-12 px-5 bg-white w-full box-border">
      <div className="max-w-[1180px] mx-auto">
        <h2 className="text-center text-4xl font-black text-brand mb-10">
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
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-br from-brand to-brand-secondary flex items-center justify-center text-white font-extrabold flex-shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-bold text-sm text-brand">{t.name}</div>
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
