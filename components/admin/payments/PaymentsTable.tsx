'use client';

import { useEffect, useState } from 'react';
import { Ban, Check, CircleCheck, ClipboardClock, Copy, Ellipsis, Eye, ReceiptText, RefreshCw, Search, ShieldCheck, ShieldOff, UnlockKeyhole, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Badge } from '@/components/shadcn/badge';
import { Card, CardContent } from '@/components/shadcn/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/shadcn/pagination';
import { useAdminPaymentAction, useAdminPaymentsTable } from '@/hooks/useAdminPaymentsTable';
import { availablePaymentActions, PAYMENT_ACCESS_OPTIONS, PAYMENT_SOURCE_OPTIONS, PAYMENT_STATUS_OPTIONS, type AdminPaymentAction, type AdminPaymentFilters, type AdminPaymentRow } from '@/lib/adminPaymentTypes';
import { getPaymentMethod } from '@/lib/paymentMethods';
import { AccessStatusBadge, PaymentStatusBadge } from './PaymentBadges';
import { PaymentConfirmDialog, PaymentDetailDialog, paymentDate, rupiah, type PaymentConfirmation } from './PaymentDialogs';

const actionIcons = { verify: Check, reject: X, block: Ban, restore: UnlockKeyhole, sync: RefreshCw, ban: ShieldOff, unban: ShieldCheck };
const dropdownLabels: Record<AdminPaymentAction, string> = {
  verify: 'Terima', reject: 'Tolak', block: 'Blokir akses', restore: 'Pulihkan akses',
  sync: 'Cek status', ban: 'Blokir akun', unban: 'Buka blokir akun',
};

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <Select items={options} value={value} onValueChange={(next) => { if (next) onChange(next); }}><SelectTrigger aria-label={label} className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

export function PaymentsTable() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AdminPaymentFilters>({ search: '', source: 'all', status: 'all', access: 'all', page: 1 });
  const [detail, setDetail] = useState<AdminPaymentRow | null>(null);
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);
  const [reason, setReason] = useState('');
  const query = useAdminPaymentsTable(filters);
  const mutation = useAdminPaymentAction();
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const rows = query.data?.payments ?? [];
  const total = query.data?.total ?? 0;
  const summary = query.data?.summary;
  const summaryCards = [
    { label: 'Total pembayaran', value: summary?.total, icon: ReceiptText, color: 'bg-blue-600 text-white' },
    { label: 'Menunggu pembayaran', value: summary?.pending, icon: ClipboardClock, color: 'bg-yellow-400 text-yellow-950' },
    { label: 'Pembayaran berhasil', value: summary?.paid, icon: CircleCheck, color: 'bg-green-700 text-white' },
    { label: 'Akses diblokir', value: summary?.blocked, icon: Ban, color: 'bg-red-600 text-white' },
  ];
  const pageSize = query.data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = query.isPlaceholderData ? filters.page : query.data?.page ?? filters.page;
  const disabled = mutation.isPending || query.isPlaceholderData;
  const updateFilter = (key: 'source' | 'status' | 'access', value: string) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const openConfirmation = (value: PaymentConfirmation) => { mutation.reset(); setReason(''); setConfirmation(value); };
  const act = (row: AdminPaymentRow, action: AdminPaymentAction) => {
    mutation.mutate({ row, action, reason }, {
      onSuccess: () => { setConfirmation(null); toast.success(action === 'sync' ? 'Status Midtrans diperiksa.' : 'Perubahan berhasil disimpan.'); },
      onError: (error) => { if (action === 'sync') toast.error(error.message); },
    });
  };
  const copy = async (reference: string) => {
    try { await navigator.clipboard.writeText(reference); toast.success('Nomor pesanan disalin.'); }
    catch { toast.error('Nomor pesanan gagal disalin.'); }
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-brand sm:text-3xl">Pembayaran</h1><p className="mt-2 text-sm text-muted-foreground">Kelola pembayaran manual dan Midtrans, verifikasi bukti transfer, serta akses peserta.</p></div><Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : undefined} aria-hidden="true" />Perbarui</Button></header>
    <section aria-label="Ringkasan pembayaran" aria-busy={query.isFetching} className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
      {summaryCards.map(({ label, value, icon: Icon, color }) => <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-0"><CardContent className="flex flex-col items-center gap-2 px-4 py-3 text-center"><span className={`flex size-9 items-center justify-center rounded-lg ${color}`}><Icon className="size-4" aria-hidden="true" /></span><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight text-brand">{value == null ? '—' : value.toLocaleString('id-ID')}</p></div></CardContent></Card>)}
    </section>
    <p className="text-xs text-muted-foreground">Ringkasan mengikuti pencarian dan filter yang dipilih.</p>
    <section className="space-y-5 rounded-2xl bg-white p-4 sm:p-6" aria-label="Daftar pembayaran">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={200} aria-label="Cari pembayaran" placeholder="Cari nama, email, nomor pesanan, atau paket..." className="pl-9" /></div>
        <FilterSelect label="Sumber pembayaran" value={filters.source} options={PAYMENT_SOURCE_OPTIONS} onChange={(value) => updateFilter('source', value)} />
        <FilterSelect label="Status pembayaran" value={filters.status} options={PAYMENT_STATUS_OPTIONS} onChange={(value) => updateFilter('status', value)} />
        <FilterSelect label="Status akses" value={filters.access} options={PAYMENT_ACCESS_OPTIONS} onChange={(value) => updateFilter('access', value)} />
      </div>
      {query.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{query.error.message} <button className="rounded font-medium underline focus-visible:outline-2" onClick={() => void query.refetch()}>Coba lagi</button></p>}
      <div aria-busy={query.isFetching} className={query.isPlaceholderData ? 'opacity-60' : undefined}>
        <Table>
          <TableHeader><TableRow>{['Pesanan', 'Peserta', 'Paket', 'Metode', 'Total', 'Status Pembayaran', 'Status Akses', 'Tanggal', 'Aksi'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {query.isPending ? <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">Memuat pembayaran...</TableCell></TableRow> : !rows.length ? <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">{query.isError ? 'Data pembayaran belum tersedia.' : filters.search || filters.source !== 'all' || filters.status !== 'all' || filters.access !== 'all' ? 'Tidak ada pembayaran yang sesuai pencarian dan filter.' : 'Belum ada pembayaran.'}</TableCell></TableRow> : rows.map((row) => <TableRow key={`${row.source}-${row.id}`}>
              <TableCell><p className="max-w-56 truncate font-mono text-xs" title={row.reference}>{row.reference}</p><Badge variant="secondary" className="mt-2 rounded-md">{row.source === 'manual' ? 'Manual' : 'Midtrans'}</Badge></TableCell>
              <TableCell><p className="font-medium">{row.userName}</p><p className="mt-1 text-xs text-muted-foreground">{row.userId}</p>{row.userIsBlocked && <Badge variant="destructive" className="mt-2 rounded-md">Akun diblokir</Badge>}</TableCell>
              <TableCell className="max-w-64 whitespace-normal font-medium">{row.packageName}</TableCell>
              <TableCell>{row.source === 'manual' ? 'Transfer bank' : getPaymentMethod(row.paymentMethod)?.label ?? row.paymentMethod}</TableCell>
              <TableCell className="font-semibold">{rupiah(row.totalAmount)}</TableCell>
              <TableCell><PaymentStatusBadge row={row} /></TableCell><TableCell><AccessStatusBadge row={row} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">{paymentDate(row.createdAt)} WIB</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={disabled} />} aria-label={`Aksi pembayaran ${row.reference}`}><Ellipsis aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => setDetail(row)}><Eye aria-hidden="true" />Detail</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void copy(row.reference)}><Copy aria-hidden="true" />Salin nomor</DropdownMenuItem>
                <DropdownMenuSeparator />
                {availablePaymentActions(row).map((action) => {
                  const Icon = actionIcons[action];
                  return <DropdownMenuItem key={action} variant={['reject', 'block', 'ban'].includes(action) ? 'destructive' : 'default'} onClick={() => action === 'sync' ? act(row, action) : openConfirmation({ row, action })}><Icon aria-hidden="true" />{dropdownLabels[action]}</DropdownMenuItem>;
                })}
              </DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground"><p aria-live="polite">{total ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} dari ${total} pembayaran` : '0 pembayaran'}</p><Pagination className="mx-0 w-auto" aria-label="Halaman pembayaran"><PaginationContent>
        <PaginationItem><PaginationPrevious href="#" text="Sebelumnya" aria-label="Halaman sebelumnya" aria-disabled={currentPage <= 1 || query.isFetching} tabIndex={currentPage <= 1 ? -1 : undefined} onClick={(event) => { event.preventDefault(); if (currentPage > 1 && !query.isFetching) setFilters((current) => ({ ...current, page: currentPage - 1 })); }} className={currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined} /></PaginationItem>
        <PaginationItem><span className="px-3 text-xs">{currentPage} / {pages}</span></PaginationItem>
        <PaginationItem><PaginationNext href="#" text="Berikutnya" aria-label="Halaman berikutnya" aria-disabled={currentPage >= pages || query.isFetching} tabIndex={currentPage >= pages ? -1 : undefined} onClick={(event) => { event.preventDefault(); if (currentPage < pages && !query.isFetching) setFilters((current) => ({ ...current, page: currentPage + 1 })); }} className={currentPage >= pages ? 'pointer-events-none opacity-50' : undefined} /></PaginationItem>
      </PaginationContent></Pagination></div>
    </section>
    <PaymentDetailDialog row={detail} onClose={() => setDetail(null)} onAction={openConfirmation} />
    <PaymentConfirmDialog confirmation={confirmation} reason={reason} onReasonChange={setReason} onClose={() => { if (!mutation.isPending) setConfirmation(null); }} onConfirm={() => { if (confirmation) act(confirmation.row, confirmation.action); }} isPending={mutation.isPending} error={mutation.error?.message ?? null} />
  </div>;
}
