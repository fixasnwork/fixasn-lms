"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, Check, Clock3, ClipboardList, LayoutGrid, PackageOpen, PlayCircle } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent } from "@/components/shadcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { isPackageAvailable } from "@/lib/availability";
import { accessDurationLabel } from "@/lib/packageAccess";
import type { Package, LogoConfig } from "@/lib/types";
import { Highlight } from "./Highlight";

const CATEGORIES = [
  { value: "all", label: "Semua", icon: LayoutGrid },
  { value: "tryout", label: "Tryout SKD", icon: ClipboardList },
  { value: "video", label: "Video Pembelajaran", icon: PlayCircle },
] as const;

interface PackagesSectionProps {
  packages: Package[];
  isLoading?: boolean;
  isError?: boolean;
  logoConfig: LogoConfig;
  onRegister: () => void;
}

function hasTryouts(pkg: Package) {
  return (pkg.tryoutCount ?? 0) > 0 || !pkg.includesVideoPembelajaran;
}

function subscribeToGridWidth(onChange: () => void) {
  const breakpoints = [window.matchMedia("(min-width: 768px)"), window.matchMedia("(min-width: 1280px)")];
  for (const breakpoint of breakpoints) breakpoint.addEventListener("change", onChange);
  return () => {
    for (const breakpoint of breakpoints) breakpoint.removeEventListener("change", onChange);
  };
}

function getGridColumns() {
  return window.matchMedia("(min-width: 1280px)").matches ? 4 : window.matchMedia("(min-width: 768px)").matches ? 2 : 1;
}

function getServerGridColumns() { return 1; }

export function PackagesSection({ packages, isLoading = false, isError = false, logoConfig, onRegister }: PackagesSectionProps) {
  const [activeTab, setActiveTab] = useState("all");
  const reducedMotion = useReducedMotion();
  const columns = useSyncExternalStore(subscribeToGridWidth, getGridColumns, getServerGridColumns);
  const available = packages.filter((pkg) => isPackageAvailable(pkg) && !pkg.isTrial);
  const filtered = available.filter((pkg) => activeTab === "all" || (activeTab === "video" ? pkg.includesVideoPembelajaran : hasTryouts(pkg)));
  const shown = filtered;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: reducedMotion ? 0 : 0.2 } },
    exit: { opacity: 0, transition: { duration: reducedMotion ? 0 : 0.15 } },
  };

  return (
    <section id="paket" aria-labelledby="packages-title" className="scroll-mt-24 border-b border-border/60 bg-transparent">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-14 sm:px-6 sm:py-20">
        <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }} transition={{ duration: reducedMotion ? 0 : 0.4 }}
          className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-lg border border-brand/10 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand">
            <PackageOpen className="size-4" aria-hidden="true" /> Paket Belajar
          </span>
          <h2 id="packages-title" className="text-3xl font-semibold leading-tight tracking-tight text-balance text-brand-dark sm:text-4xl">
            <Highlight lineClassName="-bottom-2 h-2 text-yellow-400">{logoConfig.paketTitle}</Highlight>
          </h2>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{logoConfig.paketSubtitle}</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => { if (typeof value === "string") setActiveTab(value); }} className="w-full gap-8">
          <TabsList aria-label="Kategori paket belajar"
            className="mx-auto max-w-full flex-wrap gap-1 rounded-xl bg-card p-1.5 group-data-horizontal/tabs:h-auto sm:gap-2">
            {CATEGORIES.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="h-auto rounded-lg px-3 py-2.5 text-sm data-active:bg-primary data-active:text-primary-foreground sm:px-4">
                <Icon aria-hidden="true" className="size-4" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <p role="status" className="py-12 text-center text-base text-muted-foreground">Memuat paket...</p>
            ) : isError ? (
              <p role="alert" className="py-12 text-center text-base text-muted-foreground">Gagal memuat paket. Silakan muat ulang halaman.</p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial="hidden" animate="visible" exit="exit" variants={containerVariants}>
                  {shown.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {shown.map((pkg, index) => {
                        const tryouts = hasTryouts(pkg);
                        const Icon = tryouts ? ClipboardList : PlayCircle;
                        return (
                          <motion.article key={pkg.id} inherit={false}
                            initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 18 }}
                            whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : (index % columns) * 0.06 }}
                            className="min-w-0" aria-labelledby={`package-${pkg.id}`}>
                            <Card className="h-full rounded-2xl border border-border/80 bg-card py-0 shadow-none ring-0 transition-shadow duration-300 hover:shadow-lg hover:shadow-brand/5">
                              <CardContent className="h-full gap-5 p-5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Icon aria-hidden="true" className="size-5 text-primary" />
                                  <span className="text-sm font-medium text-primary">{tryouts && pkg.includesVideoPembelajaran ? "Tryout + Video" : tryouts ? "Tryout SKD" : "Video Pembelajaran"}</span>
                                </div>
                                <div>
                                  <h3 id={`package-${pkg.id}`} className="text-lg font-semibold tracking-tight text-brand-dark">
                                    <Highlight lineClassName="-bottom-1 h-1.5 text-yellow-400">{pkg.name}</Highlight>
                                  </h3>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{pkg.description}</p>
                                </div>
                                <ul className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
                                  <li className="flex items-start gap-2"><Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-yellow-600" /><span>Akses {accessDurationLabel(pkg.accessDurationMonths)}</span></li>
                                  {tryouts && <li className="flex items-start gap-2"><ClipboardList aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /><span>110 soal · 100 menit/sesi</span></li>}
                                  {(pkg.tryoutCount ?? 0) > 0 && <li className="flex items-start gap-2"><Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-secondary" /><span>{pkg.tryoutCount} tryout SKD</span></li>}
                                  {pkg.includesVideoPembelajaran && <li className="flex items-start gap-2"><BookOpen aria-hidden="true" className="mt-1 size-4 shrink-0 text-yellow-600" /><span>Akses video pembelajaran</span></li>}
                                </ul>
                                <div className="mt-auto flex flex-col gap-4 border-t border-border/70 pt-5">
                                  <p className="text-2xl font-semibold tracking-tight text-primary">Rp {pkg.price.toLocaleString("id-ID")}</p>
                                  <Button onClick={onRegister} aria-label={`Beli ${pkg.name}`} className="w-full rounded-xl">Beli Paket</Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                      <PackageOpen aria-hidden="true" className="size-8 text-brand/50" />
                      <p role="status" className="text-base text-muted-foreground">Belum ada paket yang tersedia{activeTab !== "all" && " di kategori ini"}.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </section>
  );
}
