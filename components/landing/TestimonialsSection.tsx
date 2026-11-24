"use client";

import { useState } from "react";
import { Quote, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/shadcn/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog";
import type { LogoConfig } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { Highlight } from "./Highlight";

interface TestimonialsSectionProps {
  logoConfig: LogoConfig;
}

function RatingStars() {
  return (
    <span role="img" aria-label="Rating 5 dari 5" className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} aria-hidden="true" className="size-4 fill-yellow-400 text-yellow-400" />)}
    </span>
  );
}

function TestimonialAvatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {getInitials(name.trim() || "Peserta")}
    </span>
  );
}

export function TestimonialsSection({ logoConfig }: TestimonialsSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const testimonials = [
    { name: logoConfig.testimonial1Name || "Rizki A.", role: logoConfig.testimonial1Role || "Kemenkes RI", text: logoConfig.testimonial1Text || "Soal-soal tryoutnya mirip banget sama ujian asli. Skor TWK saya naik dari 85 jadi 130 setelah rutin tryout di sini!" },
    { name: logoConfig.testimonial2Name || "Maya S.", role: logoConfig.testimonial2Role || "Kemendikbud RI", text: logoConfig.testimonial2Text || "Video materinya sangat terstruktur. Modul PDF-nya membantu banget untuk belajar offline. Worth it banget!" },
    { name: logoConfig.testimonial3Name || "Doni P.", role: logoConfig.testimonial3Role || "BPS Jawa Timur", text: logoConfig.testimonial3Text || "Fitur ranking bikin saya terpacu. Tahu posisi nasional sendiri sangat memotivasi untuk terus berlatih!" },
  ];
  const selected = testimonials[selectedIndex];
  // Enough slides keep Embla's loop enabled even when several cards fit at once.
  const slides = [...testimonials, ...testimonials];

  return (
    <section id="testimoni" aria-labelledby="testimonials-title" className="relative isolate scroll-mt-24 overflow-hidden border-b border-border/60 bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(27,58,107,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.035)_1px,transparent_1px)] bg-size-[38px_38px]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-14 sm:px-6 sm:py-20">
        <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }} transition={{ duration: reducedMotion ? 0 : 0.4 }}
          className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-lg border border-brand/10 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand">
            <Quote className="size-4" aria-hidden="true" /> Testimoni
          </span>
          <h2 id="testimonials-title" className="text-3xl font-semibold leading-tight tracking-tight text-balance text-foreground sm:text-4xl">
            <Highlight lineClassName="-bottom-2 h-2 text-yellow-400">Mereka yang Sudah Lolos</Highlight>
          </h2>
        </motion.div>

        <Dialog open={open} onOpenChange={setOpen}>
          <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }} transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.06 }}>
            <Carousel opts={{ align: "start", loop: true, duration: reducedMotion ? 0 : 25 }} aria-label="Testimoni peserta FIX ASN" className="pb-14 sm:px-12 sm:pb-0">
              <CarouselContent className="pb-4 pt-2">
                {slides.map((testimonial, index) => (
                  <CarouselItem key={index} className="flex basis-[min(22rem,calc(100vw-4rem))]">
                    <DialogTrigger onClick={() => setSelectedIndex(index % testimonials.length)}
                      aria-label={`Baca testimoni lengkap ${testimonial.name}`}
                      className="group relative flex min-h-72 w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm shadow-primary/5 outline-none transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transform-none motion-reduce:transition-none">
                      <span className="flex items-start gap-3 px-5 pt-6">
                        <TestimonialAvatar name={testimonial.name} />
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold text-card-foreground">{testimonial.name}</span>
                          <span className="mt-0.5 block truncate text-sm text-muted-foreground" title={`ASN ${testimonial.role}`}>ASN {testimonial.role}</span>
                          <span className="mt-2 block"><RatingStars /></span>
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5">
                        <Quote aria-hidden="true" className="size-6 shrink-0 text-primary/50" />
                        <span className="line-clamp-5 break-words text-sm leading-7 text-card-foreground">&ldquo;{testimonial.text}&rdquo;</span>
                        <span className="mt-auto pt-2 text-sm font-medium text-primary group-hover:underline">Baca selengkapnya</span>
                      </span>
                    </DialogTrigger>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious size="icon-lg" className="inset-y-auto bottom-0 left-[calc(50%-3rem)] bg-card text-primary sm:inset-y-0 sm:left-0" aria-label="Testimoni sebelumnya" />
              <CarouselNext size="icon-lg" className="inset-y-auto bottom-0 right-[calc(50%-3rem)] bg-card text-primary sm:inset-y-0 sm:right-0" aria-label="Testimoni berikutnya" />
            </Carousel>
          </motion.div>

          <DialogContent className="max-h-[85dvh] overflow-y-auto border border-border/80 bg-card sm:max-w-lg">
            <DialogHeader className="pr-8">
              <div className="flex items-center gap-3">
                <TestimonialAvatar name={selected.name} />
                <div className="min-w-0">
                  <DialogTitle className="break-words text-lg font-semibold leading-snug text-card-foreground">{selected.name}</DialogTitle>
                  <p className="mt-1 break-words text-sm text-muted-foreground">ASN {selected.role}</p>
                </div>
              </div>
              <DialogDescription className="sr-only">Testimoni lengkap peserta FIX ASN.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <Quote aria-hidden="true" className="size-8 text-primary/50" />
              <RatingStars />
            </div>
            <blockquote className="whitespace-pre-wrap break-words text-base leading-8 text-card-foreground">&ldquo;{selected.text}&rdquo;</blockquote>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
