"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Logo } from "@/components/ui";
import { Button } from "@/components/shadcn/button";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/shadcn/sheet";
import type { LogoConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Highlight } from "./Highlight";

const NAV_ITEMS = [
  { href: "#skd", label: "Struktur SKD" },
  { href: "#paket", label: "Paket Tryout" },
  { href: "#testimoni", label: "Testimoni" },
] as const;

export function LandingHeader({ logoConfig }: { logoConfig: LogoConfig }) {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const heroObserver = new IntersectionObserver(
      ([entry]) => setSolid(!entry.isIntersecting),
      { rootMargin: "-88px 0px 0px 0px" },
    );
    if (hero) heroObserver.observe(hero);

    const sectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const href = `#${entry.target.id}`;
        if (entry.isIntersecting) setActive(href);
        else setActive((current) => current === href ? null : current);
      }
    }, { rootMargin: "-20% 0px -40% 0px" });
    for (const { href } of NAV_ITEMS) {
      const section = document.getElementById(href.slice(1));
      if (section) sectionObserver.observe(section);
    }

    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      heroObserver.disconnect();
      sectionObserver.disconnect();
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav aria-label="Navigasi utama" className={cn(
        "flex w-full items-center justify-between gap-3 border-b px-5 py-3 backdrop-blur-md backdrop-saturate-150 transition-colors duration-300 sm:px-6 lg:px-12",
        solid ? "border-border/70 bg-card/95 text-foreground shadow-sm" : "border-transparent bg-white/90 text-brand-dark",
      )}>
        <Link href="/" aria-label="FIX ASN — Beranda" className="shrink-0 rounded-lg bg-white px-2 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2">
          <Logo size="sm" cfg={logoConfig} />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} aria-current={active === item.href ? "location" : undefined}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setFocused(item.href)}
              onBlur={() => setFocused(null)}
              className={cn(
                "py-2 text-sm font-medium transition-colors",
                "hover:text-brand focus-visible:text-brand",
                active === item.href || hovered === item.href || focused === item.href
                  ? "text-brand"
                  : "text-muted-foreground",
              )}>
              <Highlight show={active === item.href || hovered === item.href || focused === item.href}
                lineClassName="-bottom-1.5 h-1.5 text-yellow-400">
                {item.label}
              </Highlight>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm"
            className="hidden text-brand-dark hover:bg-brand/5 hover:text-brand sm:inline-flex">
            Masuk
          </Button>
          <Button render={<Link href="/login?action=register" />} nativeButton={false} size="sm"
            className="bg-brand text-white hover:bg-brand-dark">
            Daftar <ArrowRight aria-hidden="true" />
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="text-brand-dark hover:bg-brand/5 hover:text-brand lg:hidden" />}
              aria-label="Buka menu navigasi">
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl" >
              <SheetHeader className="border-b p-6">
                <SheetTitle><Logo size="sm" cfg={logoConfig} /></SheetTitle>
                <SheetDescription>Persiapkan langkahmu bersama FIX ASN.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Navigasi mobile" className="flex flex-col gap-1 px-4">
                {NAV_ITEMS.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setOpen(false)}
                    aria-current={active === item.href ? "location" : undefined}
                    className={cn("rounded-lg px-3 py-3 text-base font-medium hover:bg-accent hover:text-brand focus-visible:text-brand", active === item.href && "bg-accent text-brand")}>
                    {item.label}
                  </a>
                ))}
              </nav>
              <SheetFooter className="border-t p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <Button render={<Link href="/login?action=register" />} nativeButton={false} size="lg" onClick={() => setOpen(false)} className="bg-brand text-white hover:bg-brand-dark">
                  Daftar <ArrowRight aria-hidden="true" />
                </Button>
                <Button render={<Link href="/login" />} nativeButton={false} size="lg" variant="outline" onClick={() => setOpen(false)}>Masuk</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
