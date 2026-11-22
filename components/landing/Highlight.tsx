"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Inline emphasis with a curved underline or a solid highlighter mark. */
export function Highlight({
  variant = "underline",
  show,
  className,
  lineClassName,
  children,
}: {
  variant?: "underline" | "solid";
  /** When omitted, the underline draws once as it enters the viewport. */
  show?: boolean;
  className?: string;
  lineClassName?: string;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  if (variant === "solid") {
    return (
      <span className={cn(
        "rounded-[0.8em_0.3em_1em_0.25em/0.4em_0.8em_0.3em_0.9em] bg-primary box-decoration-clone px-2 text-primary-foreground",
        className,
      )}>
        {children}
      </span>
    );
  }

  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-2 h-3 w-full overflow-visible text-primary",
          lineClassName,
        )}
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        {...(show === undefined
          ? {
              whileInView: { scaleX: 1 },
              viewport: { once: true },
              transition: { duration: reducedMotion ? 0 : 0.3, delay: reducedMotion ? 0 : 0.3, ease: "easeOut" },
            }
          : {
              animate: { scaleX: show ? 1 : 0 },
              transition: { duration: reducedMotion ? 0 : 0.3, ease: "easeOut" },
            })}
      >
        <path d="M2 8 Q 50 1 98 6" fill="none" stroke="currentColor" strokeWidth={4}
          strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </motion.svg>
    </span>
  );
}
