'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck, PackageOpen } from 'lucide-react';
import { Button, buttonVariants } from '@/components/shadcn/button';
import PageLoading from '@/components/ui/PageLoading';
import { usePaymentOrder } from '@/hooks/usePaymentOrders';
import { useLogoConfig, usePackages } from '@/hooks/useTryoutQueries';
import { waMeLink } from '@/lib/utils';
import { getPaymentMethod } from '@/lib/paymentMethods';
import { OPEN_ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/paymentOrderTypes';

const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function PaymentOrderStatus({ orderId }: { orderId: string }) {
  const { data: session } = useSession();
  const query = usePaymentOrder(orderId, session?.user?.email ?? undefined);
  const client = useQueryClient();
  const { data: config } = useLogoConfig();
  const packages = usePackages();
  const supportUrl = waMeLink(config?.contactWA);
  const order = query.data?.order;
  const status = order?.status;
  const paid = status === 'paid' || status === 'partially_refunded';
  const pkg = packages.data?.find((item) => item.id === order?.packageId);
  const openHref = pkg?.includesVideoPembelajaran && !pkg.tryoutCount ? '/video' : '/tryout';
  useEffect(() => {
    if (status && !OPEN_ORDER_STATUSES.includes(status)) {
      for (const key of ['payments', 'payment-orders', 'purchase-history', 'dashboard', 'user-videos', 'video-access']) {
        void client.invalidateQueries({ queryKey: [key] });
      }
    }
  }, [client, status]);

  if (query.isPending) return <PageLoading label="Memuat status pembayaran..." />;
  if (!order) return <div className="rounded-2xl bg-white p-7"><p role="alert">{query.error?.message ?? 'Order tidak ditemukan.'}</p><Link href="/buy" className="mt-4 inline-block text-primary">Kembali ke Beli Paket</Link></div>;
  const pending = OPEN_ORDER_STATUSES.includes(order.status);
  return <div className="mx-auto max-w-xl space-y-6">
    <Link href="/purchases" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-primary focus-visible:outline-2"><ArrowLeft className="size-4" aria-hidden="true" />Kembali ke Riwayat Pembelian</Link>
    <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-8">
    <p className="text-sm text-muted-foreground">Status pembayaran</p>
    <h1 className="flex items-center gap-3 text-2xl font-semibold text-brand-dark">{ORDER_STATUS_LABELS[order.status] ?? order.status}{paid && <CircleCheck className="size-7 shrink-0 text-green-700" aria-hidden="true" />}</h1>
    <p className="font-medium">{order.packageName}</p>
    <p className="break-all text-xs text-muted-foreground">Order: {order.orderId}</p>
    <dl className="space-y-3 rounded-xl bg-muted p-4 text-sm">
      <div className="flex justify-between gap-3"><dt>Metode</dt><dd>{getPaymentMethod(order.paymentMethod)?.label ?? order.paymentMethod}</dd></div>
      <div className="flex justify-between gap-3"><dt>Harga paket</dt><dd>{rupiah(order.amount)}</dd></div>
      <div className="flex justify-between gap-3"><dt>Biaya admin</dt><dd>{rupiah(order.adminFee)}</dd></div>
      <div className="flex justify-between gap-3 font-semibold text-primary"><dt>Total bayar</dt><dd>{rupiah(order.totalAmount)}</dd></div>
    </dl>
    {paid ? <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">Pembayaran telah dikonfirmasi. Akses paket diaktifkan selama {order.accessDurationMonths} bulan sejak pembayaran berhasil.</p> : pending ? <>
      <p className="text-sm leading-6 text-muted-foreground">{order.snapRedirectUrl ? 'Selesaikan pembayaran melalui Midtrans. Status diperbarui otomatis setiap 15 detik.' : 'Checkout belum terkonfirmasi. Cek status kembali atau hubungi admin dengan nomor order ini. Hindari membuat pembayaran lain untuk paket yang sama.'}</p>
      <p className="text-xs text-muted-foreground">Batas pembayaran: {new Date(order.expiresAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
      {order.snapRedirectUrl && <a href={order.snapRedirectUrl} className={buttonVariants({ className: 'w-full rounded-xl' })}>Lanjutkan Pembayaran</a>}
    </> : <p className="text-sm text-muted-foreground">{order.status === 'refunded' ? 'Pembayaran ini telah dikembalikan dan akses dari transaksi ini dinonaktifkan.' : 'Transaksi ini tidak memberikan akses paket. Kamu dapat kembali ke detail paket untuk mencoba lagi.'}</p>}
    {(query.data?.syncUnavailable || query.isError) && <p role="alert" className="text-sm text-amber-800">Status terbaru dari Midtrans belum dapat diambil. Silakan cek kembali.</p>}
    <Button variant="secondary" className="w-full rounded-xl" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Memeriksa...' : 'Cek Status Pembayaran'}</Button>
    {paid && pkg && <Link href={openHref} className={buttonVariants({ className: 'w-full rounded-xl' })}><PackageOpen aria-hidden="true" />Buka Paket</Link>}
    {!paid && !pending && <Link href={`/payment?pkg=${order.packageId}`} className={buttonVariants({ className: 'w-full rounded-xl' })}>Kembali ke Detail Paket</Link>}
    {supportUrl && <a href={supportUrl} target="_blank" rel="noreferrer" className="block rounded-lg text-sm font-medium text-green-700 focus-visible:outline-2">Butuh bantuan? Hubungi admin</a>}
    </div>
  </div>;
}
