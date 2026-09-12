"use client";

import { Button, Card, Badge } from "@/components/ui";
import { isPackageAvailable } from "@/lib/availability";
import type { Package, LogoConfig } from "@/lib/types";
import { waMeLink } from "@/lib/utils";

interface PackagesSectionProps {
  packages: Package[];
  logoConfig: LogoConfig;
  onRegister: () => void;
}

export function PackagesSection({
  packages,
  logoConfig,
  onRegister,
}: PackagesSectionProps) {
  const waLink = waMeLink(logoConfig.contactWA);
  const tryoutPkgs = packages.filter(
    (p) => isPackageAvailable(p) && !p.isTrial,
  );
  const shown = tryoutPkgs;

  return (
    <section className="py-12 px-5 bg-[#F8FAFF] w-full box-border">
      <div className="max-w-[1180px] mx-auto">
        <h2 className="text-center text-[32px] font-black text-brand mb-2.5">
          {logoConfig.paketTitle}
        </h2>
        <p className="text-center text-gray-400 mb-8">
          {logoConfig.paketSubtitle}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 justify-center mb-8">
          <button className="px-6.5 py-2.25 rounded-full font-bold text-sm font-['Montserrat',sans-serif] border-2 border-brand bg-brand text-white cursor-pointer">
            📝 Tryout SKD
          </button>
        </div>

        {/* Package Cards */}
        <div
          className="grid gap-5.5"
          style={{
            gridTemplateColumns: `repeat(${shown.length}, 1fr)`,
            maxWidth: shown.length === 1 ? 500 : undefined,
            margin: "0 auto",
          }}
        >
          {shown.map((pkg) => (
            <Card
              key={pkg.id}
              hover
              className="relative"
              style={{
                border: "1px solid #F1F5F9",
                paddingTop: 24,
              }}
            >
              <div className="mb-4">
                <h3 className="font-black text-lg text-brand mb-1.5">
                  {pkg.name}
                </h3>
                <p className="text-gray-600 text-sm m-0">{pkg.description}</p>
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                <Badge color="blue">📝 Tryout SKD</Badge>
                <Badge color="yellow">⏱ 100 menit/sesi</Badge>
                <Badge color="purple">110 Soal/sesi</Badge>
              </div>

              <div className="flex items-end justify-between mt-4">
                <div>
                  <div className="text-3xl font-black text-brand">
                    Rp {pkg.price.toLocaleString("id-ID")}
                  </div>
                </div>
                <Button variant="primary" onClick={onRegister} size="sm">
                  Beli →
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {waLink && (
          <div className="text-center mt-7">
            <p className="text-gray-600 text-sm">
              💬 Butuh bantuan memilih paket?{" "}
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="text-brand font-bold no-underline"
              >
                Chat WhatsApp kami →
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
