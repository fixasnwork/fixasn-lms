"use client";

import { motion, useReducedMotion } from "motion/react";
import { Brain, ClipboardList, Landmark, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/card";
import type { LogoConfig } from "@/lib/types";
import { Highlight } from "./Highlight";

const MATERIALS = [
  {
    category: "TWK",
    title: "Tes Wawasan Kebangsaan",
    questions: "30 Soal",
    description: "Pancasila, UUD 1945, NKRI, Bhineka Tunggal Ika",
    summary: "Perkuat pemahaman kebangsaan sebagai bekal menghadapi soal TWK.",
    icon: Landmark,
    accentClassName: "bg-brand",
  },
  {
    category: "TIU",
    title: "Tes Intelegensia Umum",
    questions: "35 Soal",
    description: "Verbal, Numerik, Figural, Penalaran",
    summary: "Latih kemampuan berpikir dan penalaran melalui materi TIU.",
    icon: Brain,
    accentClassName: "bg-brand-secondary",
  },
  {
    category: "TKP",
    title: "Tes Karakteristik Pribadi",
    questions: "45 Soal",
    description: "Integritas, Semangat Berprestasi, Orientasi Pelayanan",
    summary: "Pelajari karakteristik pribadi dan sikap dalam situasi pelayanan melalui materi TKP.",
    icon: Lightbulb,
    accentClassName: "bg-yellow-400",
  },
] as const;

export function SkdSection({ logoConfig }: { logoConfig: LogoConfig }) {
  const reducedMotion = useReducedMotion();
  const rowVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 34 },
    visible: {
      opacity: 1, y: 0,
      transition: {
        duration: reducedMotion ? 0 : 0.42,
        ease: [0.22, 1, 0.36, 1],
        when: "beforeChildren",
        staggerChildren: reducedMotion ? 0 : 0.07,
      },
    },
  } as const;
  const panelVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 18 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] },
    },
  } as const;

  return (
    <section id="skd" aria-labelledby="skd-title"
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-border/60 bg-transparent py-14 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.07),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.09),transparent_50%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(27,58,107,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }} transition={{ duration: reducedMotion ? 0 : 0.5 }}
          className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-4 text-center sm:mb-12">
          <span className="inline-flex items-center gap-2 rounded-lg border border-brand/10 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand">
            <ClipboardList className="size-4" aria-hidden="true" /> Struktur SKD
          </span>
          <h2 id="skd-title" className="text-3xl font-semibold leading-tight tracking-tight text-brand-dark sm:text-4xl">
            <Highlight lineClassName="-bottom-2 h-2 text-yellow-400">{logoConfig.skdTitle}</Highlight>
          </h2>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground sm:text-lg">{logoConfig.skdSubtitle}</p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.14 }}
          variants={rowVariants} className="grid auto-rows-fr grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8">
          {MATERIALS.map(({ category, title, summary, icon: Icon }, index) => (
            <motion.article key={category} variants={panelVariants}
              aria-labelledby={`skd-${category.toLowerCase()}`} className="relative min-w-0">
              {index < MATERIALS.length - 1 && (
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-8 left-1/2 h-8 w-px -translate-x-1/2 bg-linear-to-b from-brand/25 via-yellow-400/70 to-brand/25 lg:-right-8 lg:bottom-auto lg:left-auto lg:top-1/2 lg:h-px lg:w-8 lg:translate-x-0 lg:bg-linear-to-r">
                  <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 ring-4 ring-background" />
                </div>
              )}
              <Card className="h-full rounded-2xl border border-border/80 bg-card py-0 shadow-sm shadow-brand/5 ring-0">
                <CardContent className="gap-4 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-brand">
                    <Icon className="size-8" strokeWidth={1.75} aria-hidden="true" />
                    <span className="text-2xl font-semibold tracking-tight">{category}</span>
                  </div>
                  <h3 id={`skd-${category.toLowerCase()}`} className="text-lg font-semibold leading-snug tracking-tight text-brand-dark">{title}</h3>
                  <p className="text-base leading-8 text-muted-foreground">{summary}</p>
                </CardContent>
              </Card>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
