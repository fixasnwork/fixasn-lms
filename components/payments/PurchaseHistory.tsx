'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PackageOpen, ReceiptText, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/shadcn/button';
import PageLoading from '@/components/ui/PageLoading';
import { usePurchaseHistory } from '@/hooks/usePurchaseHistory';
import { getPaymentMethod } from '@/lib/paymentMethods';
import { ORDER_STATUS_LABELS } from '@/lib/paymentOrderTypes';
import { MANUAL_PAYMENT_LABELS, type PurchaseHistoryItem } from '@/lib/purchaseHistoryTypes';

export const purchaseDate = (value: string) => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });
export const purchaseRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function PurchaseStatus({ purchase, solid = false }: { purchase: PurchaseHistoryItem; solid?: boolean }) {
  const label = (purchase.source === 'manual' ? MANUAL_PAYMENT_LABELS : ORDER_STATUS_LABELS)[purchase.status] ?? 'Status belum tersedia';
  const pending = ['creating', 'pending'].includes(purchase.status);
  const success = ['verified', 'paid', 'partially_refunded'].includes(purchase.status);
  const colors = solid
    ? `font-semibold ${pending ? 'bg-yellow-400 text-yellow-950' : success ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`
    : `font-medium ${pending ? 'bg-amber-50 text-amber-800' : success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`;
  return <span className={`inline-flex rounded-lg px-3 py-1.5 text-xs ${colors}`}>{label}</span>;
}

export function PurchaseAccess({ purchase }: { purchase: PurchaseHistoryItem }) {
  if (purchase.accessStatus === 'active') return <p className="text-sm text-green-700">{purchase.accessExpiresAt ? `Akses aktif sampai ${purchaseDate(purchase.accessExpiresAt)} WIB` : 'Akses paket aktif'}</p>;
  if (purchase.accessStatus === 'expired') return <p className="text-sm text-muted-foreground">Masa akses telah berakhir{purchase.accessExpiresAt ? ` pada ${purchaseDate(purchase.accessExpiresAt)} WIB` : ''}.</p>;
  if (purchase.accessStatus === 'blocked') return <p className="text-sm text-red-700">Akses paket diblokir.{purchase.blockReason ? ` ${purchase.blockReason}` : ''}</p>;
  return null;
}

function PurchaseCard({ purchase }: { purchase: PurchaseHistoryItem }) {
  const continuePayment = purchase.source === 'midtrans' && ['pending', 'creating'].includes(purchase.status);
  const titleId = `purchase-${purchase.source}-${purchase.id}`;
  return <article aria-labelledby={titleId} className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="mb-2 text-xs text-muted-foreground">{purchaseDate(purchase.createdAt)} WIB</p><h2 id={titleId} className="text-lg font-semibold text-brand-dark">{purchase.packageName}</h2></div>
      <PurchaseStatus purchase={purchase} solid />
    </div>
    <p className="break-all text-xs text-muted-foreground">No. pesanan: {purchase.reference}</p>
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-muted p-4">
      <div><p className="text-xs text-muted-foreground">Metode pembayaran</p><p className="mt-1 text-sm font-medium">{purchase.source === 'manual' ? 'Transfer bank manual' : getPaymentMethod(purchase.paymentMethod)?.label ?? purchase.paymentMethod}</p></div>
      {purchase.totalAmount != null && <div className="sm:text-right"><p className="text-xs text-muted-foreground">Total pembayaran</p><p className="mt-1 text-base font-semibold text-primary">{purchaseRupiah(purchase.totalAmount)}</p></div>}
    </div>
    <PurchaseAccess purchase={purchase} />
    <div className="flex flex-wrap gap-3">
      {purchase.accessStatus === 'active' && <Link href={purchase.openHref} className={buttonVariants({ className: 'rounded-xl' })}><PackageOpen aria-hidden="true" />Buka Paket</Link>}
      <Link href={purchase.detailHref} className={buttonVariants({ variant: continuePayment ? 'default' : 'secondary', className: 'rounded-xl' })}><ReceiptText aria-hidden="true" />{continuePayment ? 'Lanjutkan Pembayaran' : 'Detail Pesanan'}</Link>
    </div>
  </article>;
}

export function PurchaseHistory() {
  const { data: session } = useSession();
  const query = usePurchaseHistory(session?.user?.email ?? undefined);
  const purchases = query.data?.pages.flatMap((page) => page.purchases) ?? [];
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">Riwayat Pembelian</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Lihat status pembayaran, lanjutkan pesanan, dan buka paket belajarmu.</p></div>
      <Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()} className="rounded-xl"><RefreshCw className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />Perbarui</Button>
    </header>
    {query.isPending ? <PageLoading label="Memuat riwayat pembelian..." /> : <>
      {query.isError && <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-800">{query.error.message} <button type="button" onClick={() => void query.refetch()} className="rounded font-medium underline focus-visible:outline-2">Coba lagi</button></div>}
      {!query.isError && !purchases.length && <div className="flex flex-col items-center gap-5 rounded-2xl bg-white px-5 py-12 text-center"><ReceiptText className="size-10 text-primary" aria-hidden="true" /><h2 className="text-lg font-semibold text-brand-dark">Belum ada pembelian</h2><p className="text-sm text-muted-foreground">Pesanan Midtrans dan konfirmasi transfer manual akan muncul di sini.</p><Link href="/buy" className={buttonVariants({ className: 'rounded-xl' })}>Beli Paket</Link></div>}
      <ul className="space-y-4">{purchases.map((purchase) => <li key={`${purchase.source}-${purchase.id}`}><PurchaseCard purchase={purchase} /></li>)}</ul>
      {query.hasNextPage && <Button variant="secondary" disabled={query.isFetching} onClick={() => void query.fetchNextPage()} className="w-full rounded-xl">{query.isFetchingNextPage ? 'Memuat...' : 'Muat Lebih Banyak'}</Button>}
    </>}
  </div>;
}
