"use client";

import { SocialIcon } from "react-social-icons/component";
import "react-social-icons/whatsapp";
import "react-social-icons/instagram";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronRight, Heart, Mail, Trophy } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import type { LogoConfig } from "@/lib/types";
import { waMeLink } from "@/lib/utils";
import { Logo } from "@/components/ui";

interface CTASectionProps {
  logoConfig: LogoConfig;
}

export function CTASection({ logoConfig }: CTASectionProps) {
  const waLink = waMeLink(logoConfig.contactWA);
  const reducedMotion = useReducedMotion();
  return (
    <section aria-labelledby="cta-title">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
        <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }} transition={{ duration: reducedMotion ? 0 : 0.45 }}
          className="rounded-3xl border border-primary bg-primary px-6 py-8 text-primary-foreground shadow-[0_14px_32px_-28px_rgba(27,58,107,0.18)] md:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-sm font-medium text-primary-foreground">
                <Trophy className="size-4" aria-hidden="true" /> Bersama FIX ASN
              </span>
              <h2 id="cta-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-balance text-primary-foreground md:text-4xl">{logoConfig.ctaTitle}</h2>
              <p className="mt-3 text-base leading-7 text-primary-foreground/80">{logoConfig.ctaSubtitle || "Bergabung sekarang, mulai tryout hari ini juga!"}</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button render={<a href="#paket" />} nativeButton={false} size="lg" className="rounded-xl bg-yellow-400 px-5 text-primary hover:bg-yellow-300">
                Lihat Paket <ArrowRight aria-hidden="true" />
              </Button>
              {waLink && (
                <Button render={<a href={waLink} target="_blank" rel="noreferrer" />} nativeButton={false}
                  variant="outline" size="lg" className="rounded-xl border-primary-foreground/30 bg-transparent px-5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  Tanya Admin
                  <SocialIcon as="span" network="whatsapp" bgColor="transparent" fgColor="#25D366" style={{ width: 30, height: 30 }} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Footer({ logoConfig }: { logoConfig: LogoConfig }) {
  const waLink = waMeLink(logoConfig.contactWA);
  const email = logoConfig.contactEmail.trim();
  const navigation = [
    { href: "#skd", label: "Struktur SKD" },
    { href: "#paket", label: "Paket Belajar" },
    { href: "#testimoni", label: "Testimoni" },
    { href: "/login", label: "Masuk" },
    { href: "/login?action=register", label: "Daftar" },
  ];

  return (
    <footer id="kontak" className="scroll-mt-24 border-t border-border bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <Link href="/" aria-label="FIX ASN — Beranda" className="w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Logo size="lg" cfg={logoConfig} />
          </Link>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">Sukses Lolos CPNS Indonesia bersama FIX ASN.</p>
          {(email || waLink) && (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              {email && (
                <a href={`mailto:${email}`} className="inline-flex w-fit max-w-full items-center gap-3 transition-colors hover:text-primary">
                  <Mail className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="break-all">{email}</span>
                </a>
              )}
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 transition-colors hover:text-primary">
                  <SocialIcon as="span" network="whatsapp" fgColor="#25D366" bgColor="transparent" aria-hidden="true" style={{ height: 30, width: 30 }} />
                  <span>{logoConfig.contactWA}</span>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:items-end">
          <h2 className="text-sm font-semibold tracking-wide text-primary">Jelajahi FIX ASN</h2>
          <nav aria-label="Navigasi footer" className="grid gap-x-8 gap-y-3 text-sm text-muted-foreground sm:grid-cols-2 lg:text-right">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:justify-end">
                <span>{item.label}</span><ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} FIX ASN. All rights reserved.</p>
          {/* <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            <span>Developed with</span>
            <Heart className="size-3.5 fill-primary text-primary" aria-hidden="true" />
            <span className="sr-only">love</span><span>by</span>
            <a href="https://www.instagram.com/medisignaworks/" target="_blank" rel="noopener noreferrer"
              aria-label="Medisigna Works di Instagram (buka tab baru)"
              className="inline-flex items-center gap-1.5 rounded-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              <span>Medisigna Works</span>
              <SocialIcon as="span" network="instagram" fgColor="currentColor" bgColor="transparent" aria-hidden="true" style={{ height: 24, width: 24 }} />
            </a>
          </p> */}
        </div>
      </div>
    </footer>
  );
}
