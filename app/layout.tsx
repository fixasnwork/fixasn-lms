import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import AuthHydrator from "@/components/SessionProvider";
import QueryProvider from "@/components/QueryProvider";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "FIX ASN - Sukses Lolos CPNS",
  description:
    "Platform Tryout CPNS Terpercaya - 110 soal, timer 100 menit, sistem skoring TWK+TIU+TKP",
  icons: {
    icon: "/logo_only.png",
    apple: "/logo_only.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans", inter.variable)}>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <NextAuthSessionProvider>
          <QueryProvider>
            <AuthHydrator>{children}</AuthHydrator>
            <Toaster position="bottom-right" richColors />
          </QueryProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
