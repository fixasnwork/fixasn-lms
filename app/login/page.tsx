'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, Button, Card } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { ADMIN_EMAIL } from '@/data/constants';

const FAKE_GOOGLE_ACCOUNTS = [
  { name: 'Budi Santoso', email: 'budi.santoso@gmail.com', avatar: 'BS' },
  { name: 'Siti Rahayu', email: 'siti.rahayu@gmail.com', avatar: 'SR' },
  { name: 'Ahmad Fauzi', email: 'ahmad.fauzi@gmail.com', avatar: 'AF' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const logoConfig = useAppStore((state) => state.logoConfig);

  const [step, setStep] = useState<'main' | 'picking' | 'loading' | 'locked'>('main');
  const [picked, setPicked] = useState<typeof FAKE_GOOGLE_ACCOUNTS[0] | null>(null);

  const handleGoogle = (account: typeof FAKE_GOOGLE_ACCOUNTS[0]) => {
    setPicked(account);
    setStep('loading');

    setTimeout(() => {
      // Cek apakah akun ini adalah admin
      if (account.email === ADMIN_EMAIL) {
        login(
          { name: 'Admin FIX ASN', email: ADMIN_EMAIL, avatar: 'AD' },
          'admin'
        );
        router.push('/admin');
        return;
      }

      login(
        { name: account.name, email: account.email, avatar: account.avatar },
        'user'
      );
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        {/* Logo & Title */}
        <div className="text-center mb-5.5">
          <div className="flex justify-center mb-3">
            <Logo size="md" cfg={logoConfig} />
          </div>
          <h2 className="font-['Montserrat',sans-serif] font-black text-2xl text-[#1B3A6B] mb-1 m-0">
            {step === 'loading'
              ? 'Menghubungkan...'
              : step === 'locked'
              ? 'Sesi Aktif'
              : 'Masuk ke FIX ASN'}
          </h2>
          <p className="font-['Montserrat',sans-serif] text-sm text-gray-400 m-0">
            {step === 'main' ? 'Gunakan akun Google untuk melanjutkan' : ''}
          </p>
        </div>

        {/* LOADING */}
        {step === 'loading' && picked && (
          <div className="text-center py-4">
            <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-white font-black text-xl mx-auto mb-3.5">
              {picked.avatar}
            </div>
            <div className="flex gap-1.5 justify-center mb-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#2563EB] opacity-70 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="font-['Montserrat',sans-serif] text-sm text-gray-500">
              Memverifikasi akun Google...
            </p>
          </div>
        )}

        {/* MAIN - Google Button */}
        {step === 'main' && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700 font-['Montserrat',sans-serif] leading-relaxed">
              <strong>Demo:</strong> Klik Google lalu pilih akun. Akun{' '}
              <strong>admin@fixasn.id</strong> akan masuk sebagai Admin.
            </div>

            <button
              onClick={() => setStep('picking')}
              className="w-full py-3.5 px-5 border-1.5 border-gray-200 rounded-xl bg-white cursor-pointer flex items-center justify-center gap-3 font-['Montserrat',sans-serif] font-bold text-base text-gray-700 shadow-md transition-shadow duration-200 hover:shadow-lg"
            >
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-2.9-11.3-7.1l-6.5 5C9.5 39.5 16.3 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.2 5.2C40.9 35.1 44 30 44 24c0-1.3-.1-2.7-.4-4z"
                />
              </svg>
              Lanjutkan dengan Google
            </button>

            <p className="font-['Montserrat',sans-serif] text-xs text-gray-400 text-center mt-4.5 leading-relaxed">
              Dengan masuk, kamu menyetujui <strong>Syarat & Ketentuan</strong> FIX ASN.
              <br />
              Butuh bantuan?{' '}
              <a href="https://wa.me/628987608379" className="text-[#1B3A6B] font-bold">
                Chat WhatsApp
              </a>
            </p>
          </div>
        )}

        {/* PICK ACCOUNT */}
        {step === 'picking' && (
          <div>
            <p className="font-['Montserrat',sans-serif] text-sm text-gray-500 mb-3.5 text-center">
              Pilih akun Google (simulasi demo):
            </p>

            <div className="flex flex-col gap-2.5 mb-3.5">
              {[...FAKE_GOOGLE_ACCOUNTS, { name: 'Admin FIX ASN', email: ADMIN_EMAIL, avatar: 'AD' }].map(
                (acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleGoogle(acc)}
                    className="flex items-center gap-3.5 p-3 border-1.5 border-gray-200 rounded-xl bg-white cursor-pointer font-['Montserrat',sans-serif] transition-all duration-150 text-left w-full hover:border-blue-500 hover:bg-blue-50"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
                      style={{
                        background:
                          acc.email === ADMIN_EMAIL
                            ? 'linear-gradient(135deg,#B8860B,#F5C518)'
                            : 'linear-gradient(135deg,#1B3A6B,#2563EB)',
                      }}
                    >
                      {acc.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800">{acc.name}</div>
                      <div className="text-xs text-gray-400">{acc.email}</div>
                    </div>
                    {acc.email === ADMIN_EMAIL && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                        Admin
                      </span>
                    )}
                    <div className="text-lg text-gray-400">›</div>
                  </button>
                )
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setStep('main')}>
              ← Kembali
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
