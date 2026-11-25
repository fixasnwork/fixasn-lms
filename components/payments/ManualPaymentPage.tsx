"use client";

import { Suspense, useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ClipboardList, Clock3, Copy, CreditCard, FileQuestion, Landmark, PackageOpen, Upload, X } from "lucide-react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/shadcn/button";
import PageLoading from "@/components/ui/PageLoading";
import { SocialIcon } from "react-social-icons/component";
import "react-social-icons/whatsapp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog";
import { Highlight } from "@/components/landing/Highlight";
import { useSession } from "next-auth/react";
import { useBanks, useCreatePayment, useLogoConfig, usePackages, useUserPayments } from "@/hooks/useTryoutQueries";
import { isAvailable } from "@/lib/availability";
import { accessDurationLabel, hasPaymentAccess } from "@/lib/packageAccess";
import { waMeLink } from "@/lib/utils";

const surface = "rounded-2xl bg-white p-5 sm:p-7";
const backLink = "inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
const rupiah = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;

function WhatsAppIcon() {
  return <SocialIcon as="span" network="whatsapp" bgColor="transparent" fgColor="#25D366" aria-hidden="true" className="shrink-0 [&_svg]:size-full!" style={{ width: 36, height: 36 }} />;
}

function CopyAccountNumber({ accountNumber, bankName }: { accountNumber: string; bankName: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="min-w-0 break-all font-mono text-lg font-semibold text-primary select-all">{accountNumber}</p>
        <Button type="button" variant="secondary" size="icon" onClick={copy} aria-label={`Salin nomor rekening ${bankName}`} title="Salin nomor rekening" className="shrink-0 rounded-lg bg-white hover:bg-white/80">
          {copyStatus === "copied" ? <Check className="size-4 text-green-700" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        </Button>
      </div>
      <p role="status" className={cn("text-xs", copyStatus === "error" ? "text-red-700" : "text-green-700")}>
        {copyStatus === "copied" ? "Nomor rekening disalin" : copyStatus === "error" ? "Gagal menyalin. Silakan salin nomor secara manual." : ""}
      </p>
    </div>
  );
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div role={error ? "alert" : "status"} className={`${surface} text-center text-sm leading-6 text-muted-foreground`}>{children}<Link href="/buy" className={cn(backLink, "mt-4 flex justify-center")}><ArrowLeft className="size-4" aria-hidden="true" />Kembali ke Beli Paket</Link></div>;
}

function PaymentContent({ packageId }: { packageId: number }) {
  const { data: session, status } = useSession();
  const packagesQuery = usePackages();
  const paymentsQuery = useUserPayments(session?.user?.email ?? undefined);
  const banksQuery = useBanks();
  const { data: logoConfig } = useLogoConfig();
  const createPayment = useCreatePayment();
  const [step, setStep] = useState<"detail" | "pay" | "done">("detail");
  const [proofUrl, setProofUrl] = useState("");
  const [error, setError] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const waLink = waMeLink(logoConfig?.contactWA);
  const pkg = packagesQuery.data?.find((item) => item.id === packageId);
  const payments = paymentsQuery.data ?? [];
  const active = payments.some((payment) => payment.packageId === packageId && hasPaymentAccess(payment));
  const pending = payments.some((payment) => payment.packageId === packageId && payment.status === "pending");

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Gunakan gambar JPG atau PNG dengan ukuran maksimal 5 MB.");
      return;
    }
    setReadingFile(true);
    const reader = new FileReader();
    reader.onload = () => { setProofUrl(reader.result as string); setReadingFile(false); };
    reader.onerror = () => { setError("Gambar gagal dibaca. Silakan pilih ulang file."); setReadingFile(false); };
    reader.readAsDataURL(file);
  };

  const submitPayment = () => {
    if (!pkg || !isAvailable(pkg) || active || pending || createPayment.isPending || readingFile) return;
    if (!session?.user?.email) { setError("Sesi berakhir. Silakan login kembali."); return; }
    if (!proofUrl) { setError("Pilih bukti transfer terlebih dahulu."); return; }
    setError("");
    createPayment.mutate({ packageId: pkg.id, proofUrl }, {
      onSuccess: () => setStep("done"),
      onError: (error) => setError(error?.message || "Konfirmasi pembayaran belum berhasil disimpan. Silakan coba lagi."),
    });
  };

  if (packagesQuery.isError || paymentsQuery.isError) return <Notice error>Detail paket atau status pembelian gagal dimuat. Silakan muat ulang halaman.</Notice>;
  if (status === "loading" || packagesQuery.isPending || paymentsQuery.isPending) return <PageLoading label="Memuat detail paket..." />;
  if (!pkg || pkg.isTrial || !isAvailable(pkg)) return <Notice>Paket tidak ditemukan atau sudah tidak tersedia untuk dibeli.</Notice>;

  const tryouts = (pkg.tryoutCount ?? 0) > 0 || !pkg.includesVideoPembelajaran;
  const openHref = tryouts ? "/tryout" : "/video";
  const tryoutCount = pkg.tryoutCount ?? 0;
  const busy = createPayment.isPending || readingFile;
  const features = [
    { icon: ClipboardList, title: `${tryoutCount} tryout SKD`, description: tryoutCount > 0 ? "Jumlah tryout yang kamu dapatkan dalam paket ini." : "Paket ini tidak menyertakan tryout SKD.", iconClassName: "bg-blue-50 text-blue-600" },
    { icon: Clock3, title: `Akses ${accessDurationLabel(pkg.accessDurationMonths)}`, description: "Masa akses dimulai setelah pembayaran diverifikasi admin.", iconClassName: "bg-amber-50 text-amber-600" },
    ...(tryouts ? [{ icon: FileQuestion, title: "110 soal · 100 menit/sesi", description: "Latihan TWK, TIU, dan TKP dalam setiap sesi tryout.", iconClassName: "bg-violet-50 text-violet-600" }] : []),
    ...(pkg.includesVideoPembelajaran ? [{ icon: BookOpen, title: "Video pembelajaran", description: "Akses materi video pembelajaran untuk mendukung persiapanmu.", iconClassName: "bg-emerald-50 text-emerald-600" }] : []),
  ];

  if (step === "done") return (
    <div className={`${surface} mx-auto flex max-w-xl flex-col items-center gap-5 py-10 text-center`}>
      <span className="flex size-16 items-center justify-center rounded-2xl bg-green-50 text-green-700"><CheckCircle2 className="size-8" aria-hidden="true" /></span>
      <div><h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Konfirmasi terkirim</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Pembayaran untuk <strong className="text-foreground">{pkg.name}</strong> sedang menunggu verifikasi admin. Akses paket aktif setelah pembayaran disetujui.</p></div>
      <p className="w-full rounded-xl bg-muted px-4 py-3 font-semibold text-primary">{rupiah(pkg.price)}</p>
      <Link href="/buy" className={buttonVariants({ className: "w-full rounded-xl" })}>Lihat Status Paket</Link>
      <Link href="/purchases" className={backLink}>Riwayat Pembelian</Link>
      <Link href="/dashboard" className={backLink}>Kembali ke Dashboard</Link>
    </div>
  );

  return (
    <Dialog open={step === "pay" && !active && !pending} onOpenChange={(open) => { if (!busy) setStep(open ? "pay" : "detail"); }}>
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/buy" className={backLink}><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke Beli Paket</Link>
      <header><p className="mb-3 text-sm font-medium text-primary">Detail Paket</p><h1 className="text-3xl font-semibold leading-tight tracking-tight text-brand-dark sm:text-4xl"><Highlight lineClassName="-bottom-2 h-2 text-yellow-400">{pkg.name}</Highlight></h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{pkg.description}</p></header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <section aria-labelledby="package-includes" className={surface}>
            <h2 id="package-includes" className="text-lg font-semibold text-brand-dark">Isi paket belajarmu</h2>
            <ul className="mt-6 space-y-6">{features.map(({ icon: Icon, title, description, iconClassName }) => <li key={title} className="flex gap-4"><span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconClassName)}><Icon className="size-5" aria-hidden="true" /></span><div><h3 className="font-medium text-foreground">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div></li>)}</ul>
          </section>
          <section className={surface}><h2 className="text-lg font-semibold text-brand-dark">Cara membeli paket</h2><ol className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">{["Lanjutkan ke pembayaran untuk melihat rekening tujuan.", "Transfer sesuai nominal, lalu kirim bukti pembayaran.", "Tunggu verifikasi admin, kemudian buka paket dari halaman Beli Paket."].map((text, index) => <li key={text} className="flex gap-3"><span className="font-semibold text-primary">{index + 1}.</span>{text}</li>)}</ol></section>
          {step === "pay" && !active && !pending && <DialogContent showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto rounded-2xl p-5 ring-0 sm:max-w-2xl sm:p-7">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-xl font-semibold text-brand-dark">Pembayaran Paket</DialogTitle>
              <DialogDescription>{pkg.name} · Akses {accessDurationLabel(pkg.accessDurationMonths)}. Transfer dan kirim bukti pembayaran untuk verifikasi admin.</DialogDescription>
            </DialogHeader>
            <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); submitPayment(); }}>
            <section aria-labelledby="transfer-title">
              <h2 id="transfer-title" className="flex items-center gap-2 text-lg font-semibold text-brand-dark"><Landmark className="size-5" aria-hidden="true" />Transfer bank</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Transfer dengan nominal yang sama persis ke salah satu rekening berikut.</p>
              <div className="mt-5 rounded-xl bg-primary/5 p-4"><p className="text-xs font-medium text-primary">Total transfer</p><p className="mt-1 text-2xl font-semibold text-primary">{rupiah(pkg.price)}</p></div>
              {banksQuery.isPending ? <p role="status" className="mt-4 text-sm text-muted-foreground">Memuat rekening...</p> : banksQuery.isError ? <p role="alert" className="mt-4 text-sm text-red-700">Rekening gagal dimuat. <button type="button" onClick={() => void banksQuery.refetch()} className="rounded font-medium underline focus-visible:outline-2">Coba lagi</button></p> : <div className="mt-4 space-y-3">{(banksQuery.data ?? []).filter((bank) => bank.isActive).map((bank) => <div key={bank.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-4"><div><p className="font-medium">Bank {bank.bankName}</p><p className="mt-1 text-xs text-muted-foreground">a.n. {bank.accountHolder}</p></div><CopyAccountNumber accountNumber={bank.accountNumber} bankName={bank.bankName} /></div>)}{!(banksQuery.data ?? []).some((bank) => bank.isActive) && <p role="status" className="text-sm leading-6 text-muted-foreground">Rekening pembayaran belum tersedia. Hubungi admin untuk informasi pembayaran.</p>}</div>}
            </section>
            <section aria-labelledby="confirm-title">
              <h2 id="confirm-title" className="text-lg font-semibold text-brand-dark">Konfirmasi pembayaran</h2>
              <div className="mt-5">
                {proofUrl ? <div className="relative mb-4 h-64 overflow-hidden rounded-xl bg-muted"><Image src={proofUrl} alt="Pratinjau bukti transfer" fill unoptimized sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" /><button type="button" aria-label="Hapus bukti transfer" disabled={createPayment.isPending} onClick={() => setProofUrl("")} className="absolute right-3 top-3 rounded-full bg-white p-2 text-red-700 focus-visible:outline-2 disabled:opacity-50"><X className="size-4" aria-hidden="true" /></button></div> : <div className="mb-4 rounded-xl bg-muted p-6 text-center"><Upload className="mx-auto mb-3 size-7 text-primary" aria-hidden="true" /><label htmlFor="payment-proof" className="block text-sm font-medium">Pilih bukti transfer</label><p className="my-2 text-xs text-muted-foreground">JPG atau PNG, maksimal 5 MB</p><input id="payment-proof" type="file" accept="image/jpeg,image/png" disabled={readingFile || createPayment.isPending} onChange={handleFileUpload} className="w-full rounded-lg text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-primary focus-visible:outline-2 focus-visible:outline-primary" /></div>}
                <Button className="w-full rounded-xl" disabled={!proofUrl || readingFile || createPayment.isPending} type="submit">{createPayment.isPending ? "Mengirim..." : readingFile ? "Membaca gambar..." : "Kirim Bukti Transfer"}<ArrowRight aria-hidden="true" /></Button>
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            </section>
            <Button type="button" variant="secondary" className="w-full rounded-xl" disabled={busy} onClick={() => setStep("detail")}>Kembali ke Detail Paket</Button>
            </form>
          </DialogContent>}
        </div>
        <aside className={cn(surface, "space-y-5 lg:sticky lg:top-6")} aria-labelledby="order-summary">
          <div className="flex items-center gap-2 text-primary"><PackageOpen className="size-5" aria-hidden="true" /><h2 id="order-summary" className="text-lg font-semibold">Ringkasan paket</h2></div>
          <div><p className="font-medium text-brand-dark">{pkg.name}</p><p className="mt-1 text-sm text-muted-foreground">Akses {accessDurationLabel(pkg.accessDurationMonths)}</p></div>
          <div className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">Total pembayaran</p><p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{rupiah(pkg.price)}</p></div>
          {active ? <><p className="flex items-center gap-2 text-sm text-green-700"><Check className="size-4" aria-hidden="true" />Paket ini sudah aktif</p><Link href={openHref} className={cn(buttonVariants(), "w-full rounded-xl bg-green-700 text-white hover:bg-green-800")}>Buka</Link></> : pending ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">Pembayaran paket ini sedang menunggu verifikasi admin.</p> : <DialogTrigger render={<Button className="w-full rounded-xl" />}><CreditCard aria-hidden="true" />Lanjut ke Pembayaran<ArrowRight aria-hidden="true" /></DialogTrigger>}
          <p className="flex gap-2 text-xs leading-5 text-muted-foreground"><Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Akses dihitung sejak verifikasi, bukan sejak kamu memilih paket.</p>
          {waLink && <a href={waLink} target="_blank" rel="noreferrer" className={cn(backLink, "text-green-700 hover:text-green-800")}><WhatsAppIcon />Butuh bantuan? Hubungi admin</a>}
        </aside>
      </div>
    </div>
    </Dialog>
  );
}

function SelectedPackage() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get("pkg");
  const packageId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : 0;
  if (!Number.isSafeInteger(packageId) || packageId <= 0) return <Notice>Pilih paket dari halaman Beli Paket untuk melihat detail dan melanjutkan pembayaran.</Notice>;
  return <PaymentContent key={packageId} packageId={packageId} />;
}

export default function ManualPaymentPage() {
  return <Suspense fallback={<PageLoading label="Memuat detail paket..." />}><SelectedPackage /></Suspense>;
}
