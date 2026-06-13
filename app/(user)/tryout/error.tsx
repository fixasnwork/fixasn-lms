'use client';

import { useRouter } from 'next/navigation';

export default function TryoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="font-black text-xl text-brand mb-2">Gagal Memuat Tryout</h2>
        <p className="text-sm text-gray-400 mb-6">
          {error.message || 'Terjadi kesalahan saat memuat data tryout.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-brand-secondary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => router.push('/tryout')}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            ← Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
