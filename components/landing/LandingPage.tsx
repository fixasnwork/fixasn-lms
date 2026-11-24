"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { usePackages } from "@/hooks/useTryoutQueries";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { SkdSection } from "./SkdSection";
import { PackagesSection } from "./PackagesSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CTASection, Footer } from "./CTASection";
import { FloatingWhatsappCta } from "./FloatingWhatsappCta";

export function LandingPage() {
  const router = useRouter();
  const { logoConfig, fetchLogoConfig } = useAppStore();
  const { data: packages = [], isPending, isError } = usePackages();

  // Load DB-stored config on mount so hero image, text, etc. reflect admin changes
  useEffect(() => {
    fetchLogoConfig();
  }, [fetchLogoConfig]);

  const handleRegister = () => router.push("/login?action=register");

  return (
    <div className="font-sans bg-background min-h-screen">
      <LandingHeader logoConfig={logoConfig} />
      <HeroSection logoConfig={logoConfig} />

      <SkdSection logoConfig={logoConfig} />

      {/* PACKAGES */}
      <PackagesSection
        packages={packages}
        isLoading={isPending}
        isError={isError}
        logoConfig={logoConfig}
        onRegister={handleRegister}
      />

      {/* TESTIMONIALS */}
      <TestimonialsSection logoConfig={logoConfig} />

      {/* CTA */}
      <CTASection logoConfig={logoConfig} />

      {/* FOOTER */}
      <Footer logoConfig={logoConfig} />
      <FloatingWhatsappCta contactWA={logoConfig.contactWA} />
    </div>
  );
}
