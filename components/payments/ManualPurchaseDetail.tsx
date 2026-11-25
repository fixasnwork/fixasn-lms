'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, PackageOpen, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/shadcn/button';
import PageLoading from '@/components/ui/PageLoading';
import { useManualPurchase } from '@/hooks/usePurchaseHistory';
import { PurchaseAccess, PurchaseStatus, purchaseDate, purchaseRupiah } from '@/components/payments/PurchaseHistory';

export function ManualPurchaseDetail({ paymentId }: { paymentId: string }) {
  const { data: session } = useSession();
  const query = useManualPurchase(paymentId, session?.user?.email ?? undefined);
  const purchase = query.data?.purchase;
  const proof = query.data?.proofUrl;
  const showProof = proof && (/^data:image\/(png|jpeg);base64,/.test(proof) || proof.startsWith('https://'));
  return <div className="mx-auto max-w-2xl space-y-6">
    <Link href="/purchases" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-primary focus-visible:outline-2"><ArrowLeft className="size-4" aria-hidden="true" />Kembali ke Riwayat Pembelian</Link>
    {query.isPending ? <PageLoading label="Memuat detail pesanan..." /> : !purchase ? <div role="alert" className="rounded-2xl bg-white p-6"><p>{query.error?.message ?? 'Pembelian tidak ditemukan.'}</p><Button variant="secondary" onClick={() => void query.refetch()} className="mt-4 rounded-xl">Coba Lagi</Button></div> : <article className="space-y-6 rounded-2xl bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><h1 className="text-2xl font-semibold text-brand-dark">Detail Pesanan</h1><PurchaseStatus purchase={purchase} /></div>
      <h2 className="text-lg font-semibold">{purchase.packageName}</h2>
      <dl className="space-y-4 rounded-xl bg-muted p-4 text-sm">
        <div><dt className="text-muted-foreground">Nomor pesanan</dt><dd className="mt-1 break-all font-medium">{purchase.reference}</dd></div>
        <div><dt className="text-muted-foreground">Tanggal pembelian</dt><dd className="mt-1">{purchaseDate(purchase.createdAt)} WIB</dd></div>
        <div><dt className="text-muted-foreground">Metode pembayaran</dt><dd className="mt-1">Transfer bank manual</dd></div>
        {purchase.totalAmount != null && <div><dt className="text-muted-foreground">Total pembayaran</dt><dd className="mt-1">{purchaseRupiah(purchase.totalAmount)}</dd></div>}
        {purchase.accessDurationMonths != null && <div><dt className="text-muted-foreground">Masa akses</dt><dd className="mt-1">{purchase.accessDurationMonths} bulan sejak verifikasi</dd></div>}
        {purchase.paidAt && <div><dt className="text-muted-foreground">Diverifikasi pada</dt><dd className="mt-1">{purchaseDate(purchase.paidAt)} WIB</dd></div>}
      </dl>
      <PurchaseAccess purchase={purchase} />
      {purchase.status === 'pending' && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">Bukti transfer sudah terkirim dan sedang menunggu verifikasi admin. Akses paket aktif setelah pembayaran disetujui.</p>}
      {query.isError && <p role="alert" className="text-sm text-red-700">Status terbaru belum dapat dimuat. Silakan perbarui.</p>}
      <section className="space-y-3"><h2 className="text-lg font-semibold text-brand-dark">Bukti transfer</h2>{showProof ? <Image src={proof} alt={`Bukti transfer ${purchase.packageName}`} width={640} height={800} unoptimized className="max-h-[32rem] w-full rounded-xl bg-muted object-contain" /> : <p className="text-sm text-muted-foreground">Bukti transfer tidak tersedia.</p>}</section>
      <div className="flex flex-wrap gap-3">
        {purchase.accessStatus === 'active' && <Link href={purchase.openHref} className={buttonVariants({ className: 'rounded-xl' })}><PackageOpen aria-hidden="true" />Buka Paket</Link>}
        <Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()} className="rounded-xl"><RefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin' : undefined} />{query.isFetching ? 'Memeriksa...' : 'Cek Status'}</Button>
      </div>
    </article>}
  </div>;
}
