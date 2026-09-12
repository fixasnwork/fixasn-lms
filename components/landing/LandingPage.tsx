"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Logo, Button, Card } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { waMeLink } from "@/lib/utils";
import { PackagesSection } from "./PackagesSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CTASection, Footer } from "./CTASection";

export function LandingPage() {
  const router = useRouter();
  const { packages, logoConfig, fetchLogoConfig } = useAppStore();
  const waLink = waMeLink(logoConfig.contactWA);

  // Load DB-stored config on mount so hero image, text, etc. reflect admin changes
  useEffect(() => {
    fetchLogoConfig();
  }, [fetchLogoConfig]);

  const handleLogin = () => router.push("/login");
  const handleRegister = () => router.push("/login?action=register");

  return (
    <div className="font-sans bg-[#FAFBFF] min-h-screen">
      {/* NAV */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between h-[68px]">
          <Logo cfg={logoConfig} />
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={handleLogin} size="sm">
              Masuk
            </Button>
            <Button variant="primary" onClick={handleRegister} size="sm">
              Daftar Gratis
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-brand-dark via-brand to-[#1e4da0] text-white py-14 px-5 relative overflow-hidden">
        <div className="absolute -top-30 -right-5 w-[300px] h-[300px] rounded-full bg-yellow-400/7 pointer-events-none" />

        <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Content */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 bg-yellow-400/15 border border-yellow-400/30 rounded-full px-4 py-1.5 mb-5">
              <span className="text-sm">🏆</span>
              <span className="text-xs font-bold text-yellow-400">
                {logoConfig.promoBannerText ||
                  "Platform Tryout CPNS Terpercaya #1"}
              </span>
            </div>

            <h1 className="text-5xl font-black leading-tight mb-4 text-white text-left">
              {logoConfig.heroTitle1}
              <br />
              <span className="text-yellow-400">{logoConfig.heroTitle2}</span>
              <br />
              {logoConfig.heroTitle3}
            </h1>

            <p className="text-base text-white/85 leading-relaxed mb-7 text-left">
              {logoConfig.heroDesc}
            </p>

            <div className="flex gap-3 flex-wrap justify-start mb-8">
              <Button variant="gold" size="lg" onClick={handleRegister}>
                Mulai Tryout Sekarang →
              </Button>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Button variant="white" size="lg">
                    <span className="flex items-center gap-2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="#25D366"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp Kami
                    </span>
                  </Button>
                </a>
              )}
            </div>

            <div className="flex gap-8 mt-8 justify-start">
              {[
                [logoConfig.stat1Val, logoConfig.stat1Label],
                [logoConfig.stat2Val, logoConfig.stat2Label],
                [logoConfig.stat3Val, logoConfig.stat3Label],
              ].map(([val, label], i) => (
                <div key={i} className="text-left">
                  <div className="text-3xl font-black text-yellow-400">
                    {val}
                  </div>
                  <div className="text-xs text-white/60 font-medium mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden shadow-2xl relative h-[230px] bg-brand">
              <HeroImage heroImg={logoConfig.heroImg} />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/75 to-transparent" />
              <div className="absolute bottom-3.5 left-4 right-4">
                <p className="font-['Montserrat',sans-serif] font-bold text-sm text-yellow-400 mb-0.5">
                  🏆 {logoConfig.heroCaption}
                </p>
                <p className="font-['Montserrat',sans-serif] text-xs text-white m-0">
                  {logoConfig.heroSubCaption}
                </p>
              </div>
            </div>

            {[
              {
                icon: "📝",
                title: "Tryout SKD Real-Time",
                desc: "110 soal · 100 menit · TWK, TIU, TKP",
              },
              {
                icon: "🏅",
                title: "Ranking Nasional Live",
                desc: "Bersaing dan pantau posisimu real-time",
              },
              {
                icon: "🎬",
                title: "Video + Modul Download",
                desc: "Materi lengkap TWK, TIU, TKP + PDF",
              },
              {
                icon: "📊",
                title: "Pembahasan Lengkap",
                desc: "Pembahasan tiap soal setelah tryout selesai",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-9.5 h-9.5 rounded-xl bg-yellow-400/18 flex items-center justify-center text-4 flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">
                    {feature.title}
                  </div>
                  <div className="text-xs text-white/60 mt-0.25">
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SKD INFO */}
      <section className="py-11 px-5 bg-white w-full box-border">
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-center text-4xl font-black text-brand mb-2">
            {logoConfig.skdTitle}
          </h2>
          <p className="text-center text-gray-400 mb-9">
            {logoConfig.skdSubtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                cat: "TWK",
                full: "Tes Wawasan Kebangsaan",
                soal: "30 Soal",
                icon: "🏛️",
                color: "#2563EB",
                bg: "bg-blue-50",
                desc: "Pancasila, UUD 1945, NKRI, Bhineka Tunggal Ika",
              },
              {
                cat: "TIU",
                full: "Tes Intelegensia Umum",
                soal: "35 Soal",
                icon: "🧠",
                color: "#7C3AED",
                bg: "bg-purple-50",
                desc: "Verbal, Numerik, Figural, Penalaran",
              },
              {
                cat: "TKP",
                full: "Tes Karakteristik Pribadi",
                soal: "45 Soal",
                icon: "💡",
                color: "#D97706",
                bg: "bg-amber-50",
                desc: "Integritas, Semangat Berprestasi, Orientasi Pelayanan",
              },
            ].map((item) => (
              <Card
                key={item.cat}
                className={`${item.bg} border-2 text-center`}
                style={{ borderColor: `${item.color}25` }}
              >
                <div className="text-9 mb-2.5">{item.icon}</div>
                <div
                  className="font-black text-2xl mb-1"
                  style={{ color: item.color }}
                >
                  {item.cat}
                </div>
                <div className="text-sm text-gray-700 font-bold mb-2">
                  {item.full}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  {item.desc}
                </div>
                <div
                  className="mt-3 rounded-lg px-2.5 py-1.5 inline-block"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <span
                    className="font-extrabold text-sm"
                    style={{ color: item.color }}
                  >
                    {item.soal}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <PackagesSection
        packages={packages}
        logoConfig={logoConfig}
        onRegister={handleRegister}
      />

      {/* TESTIMONIALS */}
      <TestimonialsSection logoConfig={logoConfig} />

      {/* CTA */}
      <CTASection logoConfig={logoConfig} onRegister={handleRegister} />

      {/* FOOTER */}
      <Footer logoConfig={logoConfig} />
    </div>
  );
}

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700&q=85";

/** Internal component to handle hero image with fallback via next/image */
function HeroImage({ heroImg }: { heroImg: string }) {
  const [errorUrl, setErrorUrl] = useState<string | null>(null);

  // Use fallback only if the current heroImg URL previously errored;
  // when heroImg changes, this naturally clears stale errors.
  const src = errorUrl === heroImg ? HERO_FALLBACK : heroImg;

  return (
    <Image
      src={src}
      alt="Hero"
      fill
      sizes="(max-width: 1024px) 100vw, 50vw"
      className="object-cover"
      priority
      onError={() => setErrorUrl(heroImg)}
    />
  );
}
