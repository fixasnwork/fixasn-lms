"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Package, Star, Trophy, Users } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import type { LogoConfig } from "@/lib/types";

const STAT_ICONS = [Users, BadgeCheck, BookOpen] as const;

const HERO_FALLBACK = "/hero1.png";

export function HeroSection({ logoConfig }: { logoConfig: LogoConfig }) {
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const imageUrl = logoConfig.heroImg || HERO_FALLBACK;

  return (
    <section id="hero" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-white text-brand-dark">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-white via-white to-blue-50/80" />
        <div className="absolute -right-16 bottom-0 size-64 rounded-full bg-blue-50 md:-bottom-20 md:size-[28rem]" />
        <div className="absolute -left-32 -top-40 size-96 rounded-full bg-sky-50/60 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(27,58,107,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      </div>
      <div className="w-full px-5 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-12">
        <div className="grid items-center gap-14 md:grid-cols-2 md:gap-10 lg:gap-16">
          <div className="flex min-w-0 flex-col items-start gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            <div className="inline-flex max-w-full items-center gap-2 rounded-md bg-brand/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand sm:text-sm">
              <Trophy className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
              {logoConfig.promoBannerText || "Platform Tryout CPNS Terpercaya #1"}
            </div>
            <h1 id="hero-title" className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="relative isolate inline-block text-brand-secondary">
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0.5 -z-10 h-[0.22em] -rotate-1 rounded-full bg-yellow-200/80" />
                {logoConfig.heroTitle1}
              </span><br />
              {logoConfig.heroTitle2}<br />
              {logoConfig.heroTitle3}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">{logoConfig.heroDesc}</p>
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
              <Button render={<Link href="/login?action=register" />} nativeButton={false} size="lg"
                className="h-11 min-w-0 bg-brand px-2 text-white hover:bg-brand-dark sm:px-5">
                Daftar Sekarang <ArrowRight aria-hidden="true" />
              </Button>
              <Button render={<a href="#paket" />} nativeButton={false} size="lg"
                className="h-11 min-w-0 bg-yellow-400 px-2 text-brand-dark hover:bg-yellow-300 sm:px-5">
                <Package aria-hidden="true" /> Lihat Paket
              </Button>
            </div>
            <dl className="mt-2 grid w-full grid-cols-3 gap-2 sm:gap-3">
              {[
                [logoConfig.stat1Val, logoConfig.stat1Label],
                [logoConfig.stat2Val, logoConfig.stat2Label],
                [logoConfig.stat3Val, logoConfig.stat3Label],
              ].map(([value, label], index) => {
                const Icon = STAT_ICONS[index];
                return (
                  <div key={index} className="relative flex min-w-0 flex-col rounded-xl bg-white p-3 ring-1 ring-slate-100 sm:px-4 sm:py-5 xl:pl-14">
                    <Icon aria-hidden="true" className="mb-2 size-7 rounded-lg bg-brand-secondary/5 p-1.5 text-brand-secondary xl:absolute xl:left-4 xl:top-5" />
                    <dt className="order-2 mt-1 text-xs leading-relaxed text-slate-500">{label}</dt>
                    <dd className="order-1 text-lg font-bold tracking-tight text-brand-dark sm:text-xl">{value}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="relative isolate mx-auto w-full max-w-sm min-w-0 px-5 pb-8 pt-4 sm:max-w-md sm:px-8 lg:max-w-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-1000">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 bottom-10 -z-10 aspect-square rounded-full bg-blue-100/70 sm:inset-x-12" />
            <div aria-hidden="true" className="pointer-events-none absolute left-4 top-[18%] -z-10 size-16 -rotate-[25deg] rounded-xl border-2 border-yellow-400/80 sm:size-24" />
            <div aria-hidden="true" className="pointer-events-none absolute right-3 top-[26%] -z-10 size-20 rotate-[35deg] rounded-2xl border-2 border-brand-secondary/50 sm:size-28" />
            <div aria-hidden="true" className="pointer-events-none absolute left-[12%] top-0 size-4 rounded-full bg-yellow-400" />
            <div className="relative aspect-square">
              <Image src={errorUrl === imageUrl ? HERO_FALLBACK : imageUrl}
                alt={logoConfig.heroCaption || "Persiapan CPNS bersama FIX ASN"} fill
                sizes="(max-width: 639px) min(344px, calc(100vw - 80px)), (max-width: 767px) 384px, (max-width: 1023px) min(384px, calc(50vw - 108px)), min(448px, calc(50vw - 144px))"
                className="object-contain" loading="eager" fetchPriority="high" onError={() => setErrorUrl(imageUrl)} />
            </div>
            {/* <div className="relative mt-5 text-center">
              <p className="text-base font-semibold text-brand-dark">{logoConfig.heroCaption}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{logoConfig.heroSubCaption}</p>
            </div> */}
            <Star aria-hidden="true" className="pointer-events-none absolute -left-1 bottom-[18%] size-12 -rotate-12 fill-yellow-400 text-yellow-400 sm:size-16" />
            <Star aria-hidden="true" className="pointer-events-none absolute right-1 top-2 size-7 rotate-12 fill-brand-secondary text-brand-secondary sm:size-9" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-5 right-3 rounded-2xl bg-white p-3 text-brand sm:right-5 sm:p-4">
              <BookOpen className="size-6 sm:size-8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
