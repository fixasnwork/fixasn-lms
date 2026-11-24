"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Logo } from "@/components/ui";
import { FloatingWhatsappCta } from "@/components/landing/FloatingWhatsappCta";
import { useAppStore } from "@/store/useAppStore";
import { useLogoConfig } from "@/hooks/useTryoutQueries";
import { waMeLink } from "@/lib/utils";
import styles from "./login.module.css";

function LoginShell({ children }: { children: ReactNode }) {
  const logoConfig = useAppStore((state) => state.logoConfig);
  const { data: fetchedLogoConfig } = useLogoConfig();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" aria-label="Ke beranda FIX ASN" className={styles.logoLink}>
            <Logo size="lg" cfg={fetchedLogoConfig ?? logoConfig} />
          </Link>
        </div>
        <section className={styles.card} aria-labelledby="login-title">
          {children}
        </section>
      </div>
      <FloatingWhatsappCta contactWA={(fetchedLogoConfig ?? logoConfig).contactWA} />
    </main>
  );
}

function useRedirectIfAuthenticated() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (reason === "device-replaced") return;

    if (
      status === "authenticated" &&
      session?.user &&
      !(session as { isSessionStale?: boolean }).isSessionStale
    ) {
      const role = (session.user as { role?: string }).role;
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router, reason]);
}

function LoginForm() {
  const { data: fetchedLogoConfig } = useLogoConfig();
  const waLink = waMeLink(fetchedLogoConfig?.contactWA);
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const message = searchParams.get("message");

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <LoginShell>
        <div className={styles.heading}>
          <h1 id="login-title" className={styles.title}>
            Masuk
          </h1>
          <p className={styles.description}>
            Masuk untuk lanjut ke dashboard dan akses programmu.
          </p>
        </div>

        {/* Google Sign In Button */}
        <div>
          {reason === "device-replaced" && (
            <p role="alert" className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
              {message ||
                "Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan."}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className={styles.googleButton}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
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
            Lanjut dengan Google
          </button>

          <p className={styles.terms}>
            Dengan masuk, kamu menyetujui <strong>Syarat & Ketentuan</strong>{" "}
            FIX ASN.
          </p>
          <div className={styles.footer}>
            {waLink ? (
              <p>
                Butuh bantuan?{" "}
                <a href={waLink} className={styles.helpLink}>Chat WhatsApp</a>
              </p>
            ) : (
              <p>Belum punya akun? Mulai dengan akun Google kamu.</p>
            )}
          </div>
        </div>
    </LoginShell>
  );
}

function LoadingScreen() {
  return (
    <LoginShell>
      <div className="text-center" role="status">
        <h1 id="login-title" className={styles.title}>
          Memeriksa sesi...
        </h1>
        <div className="flex gap-1.5 justify-center mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-secondary opacity-70 motion-safe:animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </LoginShell>
  );
}

function LoginContent() {
  const { status } = useSession();

  useRedirectIfAuthenticated();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginContent />
    </Suspense>
  );
}
