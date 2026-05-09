import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF] p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="font-black text-4xl text-[#1B3A6B] mb-2">404</h1>
        <h2 className="font-bold text-lg text-gray-700 mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-gray-400 mb-6">
          Halaman yang kamu cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#2563EB] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
