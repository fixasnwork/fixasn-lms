"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "cn";
import { BookOpen, Check, Clock3, ClipboardList, Gift, PlayCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { Card, CardContent } from "@/components/shadcn/card";
import { Highlight } from "@/components/landing/Highlight";
import { accessDurationLabel } from "@/lib/packageAccess";
import type { Package } from "@/lib/types";
import styles from "./PackageCard.module.css";

interface PackageCardProps {
  pkg: Package;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionTone?: "default" | "success";
}

export function PackageCard({ pkg, actionLabel = pkg.isTrial ? "Coba Gratis" : "Beli Paket", actionHref, onAction, actionDisabled = false, actionTone = "default" }: PackageCardProps) {
  const titleId = useId();
  const tryouts = (pkg.tryoutCount ?? 0) > 0 || !pkg.includesVideoPembelajaran;
  const Icon = tryouts ? ClipboardList : PlayCircle;
  const actionClassName = cn("w-full rounded-xl", (pkg.isTrial || actionTone === "success") && "bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-600/40");

  return (
    <Card data-ui="card" aria-labelledby={titleId} className={cn("h-full min-w-0 rounded-2xl border border-border/80 bg-card py-0 shadow-none ring-0 transition-shadow duration-300 hover:shadow-lg hover:shadow-brand/5", pkg.isTrial && styles.trialCard)}>
      <CardContent className="h-full gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Icon aria-hidden="true" className="size-5 text-primary" />
          <span className="text-sm font-medium text-primary">{tryouts && pkg.includesVideoPembelajaran ? "Tryout + Video" : tryouts ? "Tryout SKD" : "Video Pembelajaran"}</span>
        </div>
        <div>
          <h3 id={titleId} className="text-lg font-semibold tracking-tight text-brand-dark">
            <Highlight lineClassName="-bottom-1 h-1.5 text-yellow-400">{pkg.name}</Highlight>
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{pkg.description}</p>
        </div>
        <ul className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
          {!pkg.isTrial && <li className="flex items-start gap-2"><Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-yellow-600" /><span>Akses {accessDurationLabel(pkg.accessDurationMonths)}</span></li>}
          {tryouts && <li className="flex items-start gap-2"><ClipboardList aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /><span>110 soal · 100 menit/sesi</span></li>}
          {(pkg.tryoutCount ?? 0) > 0 && <li className="flex items-start gap-2"><Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-secondary" /><span>{pkg.tryoutCount} tryout SKD</span></li>}
          {pkg.includesVideoPembelajaran && <li className="flex items-start gap-2"><BookOpen aria-hidden="true" className="mt-1 size-4 shrink-0 text-yellow-600" /><span>Akses video pembelajaran</span></li>}
        </ul>
        <div data-slot="package-card-footer" className="mt-auto flex flex-col gap-4 border-t border-border/70 pt-5">
          {pkg.isTrial ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-xl font-bold tracking-tight text-green-800">
              <Gift aria-hidden="true" className="size-5" /> Gratis
            </span>
          ) : (
            <p className="text-2xl font-semibold tracking-tight text-primary">Rp {pkg.price.toLocaleString("id-ID")}</p>
          )}
          {actionHref ? (
            <Link href={actionHref} aria-label={`${actionLabel}: ${pkg.name}`} className={cn(buttonVariants(), actionClassName)}>{actionLabel}</Link>
          ) : (
            <Button onClick={onAction} disabled={actionDisabled} aria-label={`${actionLabel}: ${pkg.name}`} className={actionClassName}>{actionLabel}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
