'use client';

import { signOut } from 'next-auth/react';

export default function BannedClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="font-black text-2xl text-red-600 mb-3">
          Akun Anda Telah Diblokir
        </h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Akun Anda tidak dapat mengakses platform ini. Silakan hubungi admin jika
          Anda memiliki pertanyaan lebih lanjut.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl cursor-pointer border-none hover:bg-red-700 transition-colors"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
