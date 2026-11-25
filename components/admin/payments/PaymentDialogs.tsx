'use client';

import Image from 'next/image';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useAdminPaymentDetail } from '@/hooks/useAdminPaymentsTable';
import { availablePaymentActions, type AdminPaymentAction, type AdminPaymentRow } from '@/lib/adminPaymentTypes';
import { getPaymentMethod } from '@/lib/paymentMethods';
import { AccessStatusBadge, PaymentStatusBadge } from './PaymentBadges';

export const paymentDate = (value: string) => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });
export const rupiah = (value: number | null) => value == null ? '—' : `Rp ${value.toLocaleString('id-ID')}`;
export const ACTION_LABELS: Record<AdminPaymentAction, string> = {
  verify: 'Verifikasi pembayaran', reject: 'Tolak pembayaran', block: 'Blokir akses paket',
  restore: 'Buka blokir akses', sync: 'Cek status Midtrans', ban: 'Blokir akun peserta', unban: 'Buka blokir akun',
};
export interface PaymentConfirmation { row: AdminPaymentRow; action: AdminPaymentAction }

export function PaymentDetailDialog({ row, onClose, onAction }: { row: AdminPaymentRow | null; onClose: () => void; onAction: (confirmation: PaymentConfirmation) => void }) {
  const query = useAdminPaymentDetail(row);
  const payment = query.data?.payment ?? row;
  const proof = query.data?.proofUrl;
  const validProof = proof && (/^data:image\/(png|jpeg);base64,/.test(proof) || proof.startsWith('https://'));
  return <Dialog open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Detail Pembayaran</DialogTitle><DialogDescription>{payment?.reference}</DialogDescription></DialogHeader>
      {payment && <>
        <div className="flex flex-wrap gap-2"><PaymentStatusBadge row={payment} /><AccessStatusBadge row={payment} /></div>
        <dl className="grid gap-4 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
          {[
            ['Peserta', payment.userName], ['Email', payment.userId], ['Paket', payment.packageName],
            ['Sumber', payment.source === 'manual' ? 'Manual' : 'Midtrans'],
            ['Metode', payment.source === 'manual' ? 'Transfer bank manual' : getPaymentMethod(payment.paymentMethod)?.label ?? payment.paymentMethod],
            ['Tanggal pesanan', `${paymentDate(payment.createdAt)} WIB`],
            ...(payment.totalAmount == null ? [] : [['Harga paket', rupiah(payment.amount)], ['Biaya admin', rupiah(payment.adminFee)], ['Total', rupiah(payment.totalAmount)]]),
            ...(payment.paidAt ? [[payment.source === 'manual' ? 'Diverifikasi pada' : 'Dibayar pada', `${paymentDate(payment.paidAt)} WIB`]] : []),
            ...(payment.accessDurationMonths ? [['Masa akses', `${payment.accessDurationMonths} bulan`]] : []),
            ...(payment.accessExpiresAt ? [['Akses berakhir', `${paymentDate(payment.accessExpiresAt)} WIB`]] : []),
            ...(payment.transactionId ? [['ID transaksi Midtrans', payment.transactionId]] : []),
          ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>)}
        </dl>
        {payment.blockReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Alasan pembayaran/akses: {payment.blockReason}</p>}
        {payment.userIsBlocked && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Akun peserta diblokir.{payment.userBlockedReason ? ` ${payment.userBlockedReason}` : ''}</p>}
      </>}
      {query.isPending && <p role="status" className="text-sm text-muted-foreground">Memuat detail pembayaran...</p>}
      {query.isError && <p role="alert" className="text-sm text-red-700">{query.error.message} <button className="rounded underline focus-visible:outline-2" onClick={() => void query.refetch()}>Coba lagi</button></p>}
      {payment?.source === 'manual' && query.isSuccess && <section className="space-y-3"><h3 className="font-semibold">Bukti transfer</h3>{validProof ? <Image src={proof} alt={`Bukti transfer ${payment.userName}`} width={640} height={800} unoptimized className="max-h-[32rem] w-full rounded-xl bg-muted object-contain" /> : <p className="text-sm text-muted-foreground">Bukti transfer tidak tersedia.</p>}</section>}
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Tutup</Button>
        {query.isSuccess && payment && availablePaymentActions(payment).includes('verify') && <Button onClick={() => { onClose(); onAction({ row: payment, action: 'verify' }); }}>Verifikasi pembayaran</Button>}
        {query.isSuccess && payment && availablePaymentActions(payment).includes('reject') && <Button variant="destructive" onClick={() => { onClose(); onAction({ row: payment, action: 'reject' }); }}>Tolak pembayaran</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function PaymentConfirmDialog({ confirmation, reason, onReasonChange, onClose, onConfirm, isPending, error }: {
  confirmation: PaymentConfirmation | null; reason: string; onReasonChange: (value: string) => void;
  onClose: () => void; onConfirm: () => void; isPending: boolean; error: string | null;
}) {
  const action = confirmation?.action;
  const needsReason = !!action && ['reject', 'block', 'ban'].includes(action);
  const descriptions: Partial<Record<AdminPaymentAction, string>> = {
    verify: 'Pastikan bukti transfer sah. Verifikasi mengaktifkan akses paket sesuai durasi pembelian.',
    reject: 'Pembayaran ditolak dan tidak memberikan akses paket.',
    block: 'Akses dari pembayaran ini akan diblokir. Pembelian lain yang masih aktif tetap berlaku.',
    restore: confirmation?.row.source === 'manual' && !confirmation.row.paidAt ? 'Pembayaran kembali menunggu verifikasi admin.' : 'Akses dipulihkan mengikuti tanggal berakhir semula. Masa akses tidak diperpanjang.',
    ban: 'Peserta tidak dapat mengakses akun dan seluruh paketnya sampai blokir akun dibuka.',
    unban: 'Blokir akun peserta dibuka. Status pembayaran dan masa akses paket tetap berlaku.',
  };
  return <Dialog open={!!confirmation} onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
    <DialogContent showCloseButton={!isPending}>
      <DialogHeader><DialogTitle>{action ? ACTION_LABELS[action] : 'Konfirmasi'}</DialogTitle><DialogDescription>{action ? descriptions[action] : ''}</DialogDescription></DialogHeader>
      {confirmation && <div className="rounded-xl bg-muted p-4 text-sm"><p className="font-semibold">{confirmation.row.userName}</p><p className="mt-1 break-all text-muted-foreground">{confirmation.row.userId}</p><p className="mt-2">{confirmation.row.packageName}</p></div>}
      {needsReason && <div className="space-y-2"><label htmlFor="payment-action-reason" className="text-sm font-medium">Alasan <span className="text-red-700">*</span></label><Input id="payment-action-reason" value={reason} onChange={(event) => onReasonChange(event.target.value)} maxLength={1000} disabled={isPending} placeholder="Tuliskan alasan tindakan" /></div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <DialogFooter><Button variant="secondary" disabled={isPending} onClick={onClose}>Batal</Button><Button variant={needsReason ? 'destructive' : 'default'} disabled={isPending || needsReason && !reason.trim()} onClick={onConfirm}>{isPending ? 'Memproses...' : 'Konfirmasi'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
