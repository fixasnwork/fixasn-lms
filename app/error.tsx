'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF] p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="font-black text-xl text-[#1B3A6B] mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-gray-400 mb-6">
          {error.message || 'Maaf, terjadi kesalahan yang tidak terduga.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#2563EB] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
