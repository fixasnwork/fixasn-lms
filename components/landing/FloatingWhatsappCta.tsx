"use client";

import { useEffect, useState } from "react";
import { SocialIcon } from "react-social-icons/component";
import "react-social-icons/wa.me";
import { cn, waMeLink } from "@/lib/utils";

export function FloatingWhatsappCta({ contactWA }: { contactWA?: string | null }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showText, setShowText] = useState(false);
  const waLink = waMeLink(contactWA);

  useEffect(() => {
    const showCtaTimer = window.setTimeout(() => setIsVisible(true), 5000);
    const showTextTimer = window.setTimeout(() => setShowText(true), 5300);
    return () => {
      window.clearTimeout(showCtaTimer);
      window.clearTimeout(showTextTimer);
    };
  }, []);

  if (!waLink) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 sm:bottom-6 sm:right-6"
      aria-hidden={!isVisible} inert={!isVisible}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "overflow-hidden whitespace-nowrap rounded-full border border-border/80 bg-card/95 text-sm font-medium text-card-foreground shadow-[0_14px_30px_-20px_rgba(14,47,89,0.28)] backdrop-blur transition-all duration-300 ease-out motion-reduce:transition-none",
          showText ? "max-w-xs translate-x-0 px-4 py-2 opacity-100" : "max-w-0 translate-x-6 px-0 py-2 opacity-0",
        )}>
          ada yg bisa dibantu?
        </div>
        <SocialIcon url={waLink} target="_blank" rel="noreferrer" label="Chat WhatsApp"
          fgColor="#ffffff" bgColor="#25D366" style={{ height: 56, width: 56 }}
          className={cn(
            "shrink-0 rounded-full shadow-[0_18px_34px_-18px_rgba(37,211,102,0.72)] transition-all duration-500 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none",
            isVisible ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none translate-x-16 opacity-0",
          )}
        />
      </div>
    </div>
  );
}
