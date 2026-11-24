import { Suspense } from "react";
import TryoutPageClient from "./TryoutPageClient";
import TryoutRankingPreview from "@/components/tryout/TryoutRankingPreview";

export default function TryoutPage() {
  return (
    <TryoutPageClient
      rankingPreview={(
        <Suspense fallback={<p role="status" className="mt-4 text-sm text-slate-500">Memuat daftar peserta...</p>}>
          <TryoutRankingPreview />
        </Suspense>
      )}
    />
  );
}
