"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, ChartColumnIncreasing, ClipboardList, Package, Star, Trophy, Video } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import type { LogoConfig } from "@/lib/types";

const FEATURES = [
  { icon: ClipboardList, title: "Tryout SKD Real-Time", desc: "110 soal · 100 menit · TWK, TIU, TKP" },
  { icon: Trophy, title: "Ranking Nasional Live", desc: "Bersaing dan pantau posisimu real-time" },
  { icon: Video, title: "Video + Modul Download", desc: "Materi lengkap TWK, TIU, TKP + PDF" },
  { icon: ChartColumnIncreasing, title: "Pembahasan Lengkap", desc: "Pembahasan tiap soal setelah tryout selesai" },
] as const;

const HERO_FALLBACK = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700&q=85";

export function HeroSection({ logoConfig }: { logoConfig: LogoConfig }) {
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const imageUrl = logoConfig.heroImg || HERO_FALLBACK;

  return (
    <section id="hero" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-linear-to-br from-brand-dark via-brand to-[#1e4da0] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[32rem] rounded-full bg-brand-secondary/20 blur-3xl" />
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-36">
        <div className="grid items-center gap-12 pb-10 md:grid-cols-2 md:gap-10 lg:gap-16 lg:pb-14">
          <div className="flex min-w-0 flex-col items-start gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90">
              <Trophy className="size-4 shrink-0 text-yellow-400" aria-hidden="true" />
              {logoConfig.promoBannerText || "Platform Tryout CPNS Terpercaya #1"}
            </div>
            <h1 id="hero-title" className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              {logoConfig.heroTitle1}<br />
              <span className="text-yellow-400">{logoConfig.heroTitle2}</span><br />
              {logoConfig.heroTitle3}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">{logoConfig.heroDesc}</p>
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
              <Button render={<Link href="/login?action=register" />} nativeButton={false} size="lg"
                className="h-11 min-w-0 bg-white px-2 text-brand-dark hover:bg-white/90 sm:px-5">
                Daftar Sekarang <ArrowRight aria-hidden="true" />
              </Button>
              <Button render={<a href="#paket" />} nativeButton={false} size="lg"
                className="h-11 min-w-0 bg-yellow-400 px-2 text-brand-dark hover:bg-yellow-300 sm:px-5">
                <Package aria-hidden="true" /> Lihat Paket
              </Button>
            </div>
            <dl className="grid w-full grid-cols-3 gap-3 border-t border-white/15 pt-6 sm:gap-6">
              {[
                [logoConfig.stat1Val, logoConfig.stat1Label],
                [logoConfig.stat2Val, logoConfig.stat2Label],
                [logoConfig.stat3Val, logoConfig.stat3Label],
              ].map(([value, label], index) => (
                <div key={index} className="flex flex-col">
                  <dt className="mt-1 text-sm text-white/65">{label}</dt>
                  <dd className="-order-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-2 min-w-0 sm:mx-3 md:mx-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-1000">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-white/20 bg-brand-dark/30 shadow-2xl shadow-black/15">
              <Image src={errorUrl === imageUrl ? HERO_FALLBACK : imageUrl}
                alt={logoConfig.heroCaption || "Persiapan CPNS bersama FIX ASN"} fill
                sizes="(max-width: 767px) calc(100vw - 56px), (max-width: 1152px) 45vw, 520px"
                className="object-cover" loading="eager" fetchPriority="high" onError={() => setErrorUrl(imageUrl)} />
              <div className="absolute inset-0 bg-linear-to-t from-brand-dark/95 via-brand-dark/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-base font-semibold text-white">{logoConfig.heroCaption}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/75">{logoConfig.heroSubCaption}</p>
              </div>
            </div>
            <Star aria-hidden="true" className="absolute -left-4 -top-5 hidden size-11 -rotate-12 rounded-xl border border-white/20 bg-white/15 p-2.5 text-yellow-300 backdrop-blur-md sm:block" />
            <BadgeCheck aria-hidden="true" className="absolute -right-5 top-1/3 hidden size-11 rotate-12 rounded-xl border border-white/20 bg-white/15 p-2.5 text-white backdrop-blur-md sm:block" />
            <BookOpen aria-hidden="true" className="absolute -bottom-5 -left-4 hidden size-11 -rotate-6 rounded-xl border border-white/20 bg-white/15 p-2.5 text-white backdrop-blur-md sm:block" />
          </div>
        </div>

        {/* <div className="grid grid-cols-1 gap-6 border-t border-white/15 pt-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                <Icon className="size-4 text-white/85" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{desc}</p>
              </div>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  );
}
