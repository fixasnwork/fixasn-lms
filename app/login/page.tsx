'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Logo, Card } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

function useRedirectIfAuthenticated() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  useEffect(() => {
    if (reason === 'device-replaced') return;

    if (status === 'authenticated' && session?.user && !(session as { isSessionStale?: boolean }).isSessionStale) {
      const isAdmin = (session.user as { role?: string }).role === 'admin';
      router.push(isAdmin ? '/admin' : '/dashboard');
    }
  }, [status, session, router, reason]);
}

function LoginForm() {
  const logoConfig = useAppStore((state) => state.logoConfig);
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const message = searchParams.get('message');

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
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
            Masuk ke FIX ASN
          </h2>
          <p className="font-['Montserrat',sans-serif] text-sm text-gray-400 m-0">
            Gunakan akun Google untuk melanjutkan
          </p>
        </div>

        {/* Google Sign In Button */}
        <div>
          {reason === 'device-replaced' && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-['Montserrat',sans-serif] text-sm text-amber-700">
              {message || 'Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan.'}
            </p>
          )}

          <button
            onClick={handleGoogleSignIn}
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
      </Card>
    </div>
  );
}

function LoadingScreen() {
  const logoConfig = useAppStore((state) => state.logoConfig);

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-3">
          <Logo size="md" cfg={logoConfig} />
        </div>
        <h2 className="font-['Montserrat',sans-serif] font-black text-2xl text-[#1B3A6B] mb-1 m-0">
          Memeriksa sesi...
        </h2>
        <div className="flex gap-1.5 justify-center mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#2563EB] opacity-70 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  const { status } = useSession();

  useRedirectIfAuthenticated();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return <LoginForm />;
}
