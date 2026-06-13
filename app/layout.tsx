import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import AuthHydrator from '@/components/SessionProvider';
import QueryProvider from '@/components/QueryProvider';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'FIX ASN - Sukses Lolos CPNS',
  description: 'Platform Tryout CPNS Terpercaya - 110 soal, timer 100 menit, sistem skoring TWK+TIU+TKP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <NextAuthSessionProvider>
          <QueryProvider>
            <AuthHydrator>
              {children}
            </AuthHydrator>
            <Toaster position="bottom-right" richColors />
          </QueryProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
