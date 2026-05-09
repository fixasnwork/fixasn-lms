import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF] p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="font-black text-4xl text-[#1B3A6B] mb-2">401</h1>
        <h2 className="font-bold text-lg text-gray-700 mb-2">Akses Ditolak</h2>
        <p className="text-sm text-gray-400 mb-6">
          Kamu harus masuk terlebih dahulu untuk mengakses halaman ini.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-[#2563EB] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Masuk →
        </Link>
      </div>
    </div>
  );
}
