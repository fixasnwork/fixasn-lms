'use client';

export default function GlobalError({
  reset,
}: {
  error?: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF] p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">💥</div>
            <h1 className="font-black text-2xl text-brand mb-2">Kesalahan Sistem</h1>
            <p className="text-sm text-gray-400 mb-6">
              Maaf, terjadi kesalahan fatal. Silakan coba lagi nanti.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-brand-secondary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
