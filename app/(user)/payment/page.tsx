"use client";

import { Suspense, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, BookOpen, Clock3, CreditCard } from 'lucide-react';
import { Button, buttonVariants } from '@/components/shadcn/button';
import PageLoading from '@/components/ui/PageLoading';
import { useLogoConfig, usePackages, useUserPayments } from '@/hooks/useTryoutQueries';
import { useCheckout, usePaymentOrders } from '@/hooks/usePaymentOrders';
import { PAYMENT_METHODS, calculateAdminFee, type PaymentMethodCode } from '@/lib/paymentMethods';
import { OPEN_ORDER_STATUSES } from '@/lib/paymentOrderTypes';
import { accessDurationLabel, hasPaymentAccess } from '@/lib/packageAccess';
import { isAvailable } from '@/lib/availability';
import { waMeLink } from '@/lib/utils';
import ManualPaymentPage from '@/components/payments/ManualPaymentPage';
import { IS_MIDTRANS_PAYMENT_ENABLED } from '@/lib/paymentMode';

const surface = 'rounded-2xl bg-white p-5 sm:p-7';
const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

function PaymentContent({ packageId }: { packageId: number }) {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? undefined;
  const packages = usePackages();
  const payments = useUserPayments(email);
  const orders = usePaymentOrders(email);
  const checkout = useCheckout();
  const { data: config } = useLogoConfig();
  const supportUrl = waMeLink(config?.contactWA);
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethodCode>('qris');
  const pkg = packages.data?.find((item) => item.id === packageId);
  const active = payments.data?.some((payment) => payment.packageId === packageId && hasPaymentAccess(payment));
  const manualPending = payments.data?.some((payment) => payment.packageId === packageId && payment.status === 'pending');
  const openOrder = orders.data?.find((order) => order.packageId === packageId && OPEN_ORDER_STATUSES.includes(order.status));

  if (packages.isError || payments.isError || orders.isError) return <Notice error>Detail paket atau status pembelian gagal dimuat. Silakan muat ulang halaman.</Notice>;
  if (status === 'loading' || packages.isPending || payments.isPending || orders.isPending) return <PageLoading label="Memuat detail paket..." />;
  if (!pkg || pkg.isTrial || !isAvailable(pkg)) return <Notice>Paket tidak ditemukan atau sudah tidak tersedia untuk dibeli.</Notice>;

  const adminFee = calculateAdminFee(pkg.price, method);
  const openHref = pkg.includesVideoPembelajaran && !pkg.tryoutCount ? '/video' : '/tryout';
  const pay = () => checkout.mutate({ packageId, paymentMethod: method }, {
    onSuccess: ({ order }) => {
      if (order.status === 'pending' && order.snapRedirectUrl) window.location.assign(order.snapRedirectUrl);
      else router.push(`/payment/${order.orderId}`);
    },
  });

  return <div className="mx-auto max-w-6xl space-y-6">
    <Link href="/buy" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-primary focus-visible:outline-2"><ArrowLeft className="size-4" />Kembali ke Beli Paket</Link>
    <header><p className="mb-3 text-sm font-medium text-primary">Detail Paket</p><h1 className="text-3xl font-semibold tracking-tight text-brand-dark">{pkg.name}</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">{pkg.description}</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className={surface}>
          <h2 className="text-lg font-semibold text-brand-dark">Isi paket belajarmu</h2>
          <div className="mt-5 space-y-4 text-sm">
            <p>{pkg.tryoutCount ?? 0} tryout SKD</p>
            {!!pkg.tryoutCount && <p className="text-muted-foreground">110 soal · 100 menit/sesi</p>}
            <p className="flex items-center gap-2"><Clock3 className="size-4 text-amber-600" />Akses {accessDurationLabel(pkg.accessDurationMonths)}</p>
            {pkg.includesVideoPembelajaran && <p className="flex items-center gap-2"><BookOpen className="size-4 text-emerald-600" />Video pembelajaran</p>}
            <p className="leading-6 text-muted-foreground">Masa akses dimulai setelah pembayaran berhasil dikonfirmasi oleh sistem.</p>
          </div>
        </section>
      <aside className={`${surface} space-y-6 lg:sticky lg:top-6`}>
        {!active && !manualPending && !openOrder && <div>
          <fieldset disabled={checkout.isPending}>
            <legend className="text-lg font-semibold text-brand-dark">Pilih metode pembayaran</legend>
            <p className="mt-2 text-sm text-muted-foreground">Biaya admin mengikuti metode yang kamu pilih.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {PAYMENT_METHODS.map((option) => <label key={option.code} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ${method === option.code ? 'bg-blue-50' : 'bg-muted hover:bg-muted/70'}`}>
                <input type="radio" name="paymentMethod" value={option.code} checked={method === option.code} onChange={() => setMethod(option.code)} className="size-4 shrink-0 accent-blue-600" />
                <Image src={option.logo} alt="" width={56} height={28} className="h-7 w-14 shrink-0 object-contain" />
                <span className="min-w-0 text-sm font-medium leading-5">{option.label}</span>
              </label>)}
            </div>
          </fieldset>
        </div>}
        <div className="space-y-5">
        <h2 className="text-lg font-semibold text-primary">Ringkasan pembayaran</h2>
        <p className="font-medium">{pkg.name}</p>
        <dl className="space-y-3 rounded-xl bg-muted p-4 text-sm" aria-live="polite">
          <div className="flex justify-between gap-3"><dt>Harga paket</dt><dd>{rupiah(openOrder?.amount ?? pkg.price)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Biaya admin</dt><dd>{rupiah(openOrder?.adminFee ?? adminFee)}</dd></div>
          <div className="flex justify-between gap-3 pt-2 text-lg font-semibold text-primary"><dt>Total bayar</dt><dd>{rupiah(openOrder?.totalAmount ?? pkg.price + adminFee)}</dd></div>
        </dl>
        {active ? <><p className="text-sm text-green-700">Paket ini sudah aktif.</p><Link href={openHref} className={buttonVariants({ className: 'w-full rounded-xl' })}>Buka</Link></> : manualPending ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Pembayaran manual paket ini sedang menunggu verifikasi admin.</p> : openOrder ? <Link href={`/payment/${openOrder.orderId}`} className={buttonVariants({ className: 'w-full rounded-xl' })}>Lihat Status Pembayaran</Link> : <Button disabled={checkout.isPending} onClick={pay} className="w-full rounded-xl"><CreditCard className="size-4" />{checkout.isPending ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang'}</Button>}
        {checkout.isError && <p role="alert" className="text-sm text-red-700">{checkout.error.message}</p>}
        <p className="text-xs leading-5 text-muted-foreground">Pembayaran diproses melalui Midtrans. Akses aktif otomatis setelah sistem mengonfirmasi pembayaran berhasil.</p>
        {supportUrl && <a href={supportUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg text-sm font-medium text-green-700 focus-visible:outline-2">Butuh bantuan? Hubungi admin</a>}
        </div>
      </aside>
    </div>
  </div>;
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`${surface} mx-auto max-w-xl space-y-5`}><p role={error ? 'alert' : undefined}>{children}</p><Link href="/buy" className="text-sm font-medium text-primary">Kembali ke Beli Paket</Link></div>;
}

function SelectedPackage() {
  const raw = useSearchParams().get('pkg');
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
  if (!Number.isSafeInteger(id) || id <= 0) return <Notice>Pilih paket dari halaman Beli Paket untuk melanjutkan pembayaran.</Notice>;
  return <PaymentContent key={id} packageId={id} />;
}

export default function PaymentPage() {
  if (!IS_MIDTRANS_PAYMENT_ENABLED) return <ManualPaymentPage />;
  return <Suspense fallback={<PageLoading label="Memuat detail paket..." />}><SelectedPackage /></Suspense>;
}
