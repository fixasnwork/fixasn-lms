'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

/** Convert ISO string to local datetime-local input value */
function isoToLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert local datetime-local input value to ISO string */
function localDatetimeToIso(localDatetime: string): string | undefined {
  if (!localDatetime) return undefined;
  const d = new Date(localDatetime);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
import type { Package, Tryout, BankAccount } from '@/lib/types';
import { getEntityStatus, type EntityStatus } from '@/lib/availability';
import { useLogoConfig } from '@/hooks/useTryoutQueries';
import { useAppStore } from '@/store/useAppStore';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Aktif',
  scheduled: 'Terjadwal',
  expired: 'Kedaluwarsa',
  inactive: 'Tidak Aktif',
};

const STATUS_COLORS: Record<EntityStatus, string> = {
  active: 'text-green-700 bg-green-50',
  scheduled: 'text-blue-700 bg-blue-50',
  expired: 'text-gray-500 bg-gray-100',
  inactive: 'text-red-700 bg-red-50',
};
import { Button, Card, Modal } from '@/components/ui';
import {
  usePackages,
  useUpdatePackage,
  useDeletePackage,
  useCreatePackage,
  useAllTryouts,
  usePackageTryouts,
  useSetPackageTryouts,
  useCreateTryout,
  useUpdateTryout,
  useDeleteTryout,
  useAdminBanks,
  useCreateBank,
  useUpdateBank,
  useDeleteBank,
} from '@/hooks/useTryoutQueries';

interface DateRangeFieldProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startTestId: string;
  endTestId: string;
  required?: boolean;
}

function DateRangeField({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startTestId,
  endTestId,
  required = false,
}: DateRangeFieldProps) {
  return (
    <>
      <div>
        <label className="text-xs font-bold text-gray-500 block mb-1">Tanggal Mulai</label>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          data-testid={startTestId}
          required={required}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 block mb-1">Tanggal Selesai</label>
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          data-testid={endTestId}
          required={required}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
    </>
  );
}

/* ── Small tryout selector modal ──────────────────────────────── */
function TryoutSelectorModal({
  open,
  onClose,
  packageId,
  packageName,
}: {
  open: boolean;
  onClose: () => void;
  packageId: number;
  packageName: string;
}) {
  const { data: allTryouts = [], isFetching: loadingList } = useAllTryouts();
  const { data: assigned, isFetching: loadingAssigned } = usePackageTryouts(packageId);
  const setTryouts = useSetPackageTryouts();

  // Stable reference to avoid new [] every render during loading (causes infinite loop)
  const safeAssigned = assigned ?? [];

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(safeAssigned.map((t) => t.id)));
  const [prevAssigned, setPrevAssigned] = useState(safeAssigned);

  // Reset selectedIds only when assigned data actually loads or changes,
  // not on every render — a user toggle would otherwise be overwritten.
  if (!loadingAssigned && prevAssigned !== safeAssigned) {
    setPrevAssigned(safeAssigned);
    setSelectedIds(new Set(safeAssigned.map((t) => t.id)));
  }

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    setTryouts.mutate(
      { packageId, tryoutIds: [...selectedIds] },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`Atur Tryout - ${packageName}`} width={500}>
      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-4">
        {loadingList || loadingAssigned ? (
          <div className="text-center text-gray-400 text-sm py-8">Memuat daftar tryout...</div>
        ) : allTryouts.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Belum ada tryout. Buat tryout dulu di bagian &quot;Kelola Tryout&quot;.
          </div>
        ) : (
          allTryouts.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={() => toggle(t.id)}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-bold text-sm text-brand">
                  {t.name} {t.isTrial && <span className="text-amber-500 text-xs">(Trial)</span>}
                </div>
                <div className="text-xs text-gray-400">
                  {t.durationMin} menit · {t._questionCount || 0} soal · Urutan {t.sortOrder}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={setTryouts.isPending}>
          {setTryouts.isPending ? 'Menyimpan...' : `Simpan (${selectedIds.size} tryout)`}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Tryout manage modal ──────────────────────────────────────── */
function TryoutManageModal({
  open,
  onClose,
  editTryout,
}: {
  open: boolean;
  onClose: () => void;
  editTryout?: Tryout | null;
}) {
  const createTryout = useCreateTryout();
  const updateTryout = useUpdateTryout();

  const [name, setName] = useState(editTryout?.name ?? '');
  const [isTrial, setIsTrial] = useState(editTryout?.isTrial ?? false);
  const [sortOrder, setSortOrder] = useState(editTryout?.sortOrder ?? 0);
  const [durationMin, setDurationMin] = useState(editTryout?.durationMin ?? 100);
  const [startDate, setStartDate] = useState(isoToLocalDatetime(editTryout?.startDate));
  const [endDate, setEndDate] = useState(isoToLocalDatetime(editTryout?.endDate));

  const isEditing = !!editTryout;

  const save = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      isTrial,
      sortOrder,
      durationMin,
      startDate: localDatetimeToIso(startDate),
      endDate: localDatetimeToIso(endDate),
    };
    if (isEditing) {
      updateTryout.mutate(
        { id: editTryout.id, ...data },
        { onSuccess: () => onClose() }
      );
    } else {
      createTryout.mutate(data, { onSuccess: () => onClose() });
    }
  };

  const isPending = createTryout.isPending || updateTryout.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Tryout' : 'Tambah Tryout'} width={450}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Nama Tryout</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Contoh: Tryout 1 - SKD'
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Durasi (menit)</label>
            <input
              type="number"
              value={durationMin}
              min={1}
              max={300}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Urutan</label>
            <input
              type="number"
              value={sortOrder}
              min={0}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Opsi</label>
            <div className="flex items-center gap-3 min-h-[42px]">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTrial}
                  onChange={(e) => setIsTrial(e.target.checked)}
                  className="w-4 h-4"
                />
                Trial
              </label>
            </div>
          </div>
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            startTestId="tryout-start-date"
            endTestId="tryout-end-date"
          />
        </div>
        {createTryout.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{createTryout.error.message}</div>
        )}
        {updateTryout.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{updateTryout.error.message}</div>
        )}
        <Button variant="primary" onClick={save} disabled={isPending || !name.trim()}>
          {isPending ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Tryout'}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Package create modal ──────────────────────────────────────── */
function PackageCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPackage = useCreatePackage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [isTrial, setIsTrial] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const save = () => {
    if (!name.trim()) return;
    createPackage.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        price,
        isTrial,
        startDate: localDatetimeToIso(startDate),
        endDate: localDatetimeToIso(endDate),
      },
      {
        onSuccess: () => {
          onClose();
          setName('');
          setDescription('');
          setPrice(0);
          setIsTrial(false);
          setStartDate('');
          setEndDate('');
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Tambah Paket" width={450}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Nama Paket</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Paket Premium" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Deskripsi</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: 5 Paket Tryout SKD" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Harga (Rp)</label>
            <input type="number" value={price} min={0} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Opsi</label>
            <div className="flex gap-3 items-center min-h-[42px]">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="w-4 h-4" /> Trial
              </label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            startTestId="pkg-start-date"
            endTestId="pkg-end-date"
          />
        </div>
        {createPackage.error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{createPackage.error.message}</div>}
        <Button variant="primary" onClick={save} disabled={createPackage.isPending || !name.trim()}>
          {createPackage.isPending ? 'Menyimpan...' : 'Tambah Paket'}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Package edit card ─────────────────────────────────────────── */
function PackageCard({
  pkg,
  onUpdated,
  onDeleted,
}: {
  pkg: Package & { tryoutCount?: number };
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description);
  const [price, setPrice] = useState(pkg.price);
  const [isTrial, setIsTrial] = useState(pkg.isTrial);
  const [startDate, setStartDate] = useState(isoToLocalDatetime(pkg.startDate));
  const [endDate, setEndDate] = useState(isoToLocalDatetime(pkg.endDate));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTryoutSelector, setShowTryoutSelector] = useState(false);

  const saveEdit = () => {
    if (!name.trim()) return;
    updatePackage.mutate(
      {
        id: pkg.id,
        name: name.trim(),
        description: description.trim(),
        price,
        isTrial,
        startDate: localDatetimeToIso(startDate),
        endDate: localDatetimeToIso(endDate),
      },
      { onSuccess: () => { setEditing(false); onUpdated(); } }
    );
  };

  const confirmDelete = () => {
    deletePackage.mutate(pkg.id, {
      onSuccess: () => { setShowConfirm(false); onDeleted(); },
    });
  };

  return (
    <>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border border-gray-100 rounded-xl bg-blue-50">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Nama Paket</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Deskripsi</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Harga (Rp)</label>
            <input type="number" value={price} min={0} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Opsi</label>
            <div className="flex gap-2 items-center flex-wrap">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="w-4 h-4" /> Trial
              </label>
            </div>
          </div>
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            startTestId="pkg-start-date"
            endTestId="pkg-end-date"
          />
          <div className="flex items-end gap-2">
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={updatePackage.isPending}>
              {updatePackage.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Batal</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
          <div>
            <div className="font-extrabold text-sm text-brand">{pkg.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{pkg.description || '—'}</div>
          </div>
          <div>
            <div className="font-bold text-sm">Rp {pkg.price.toLocaleString()}</div>
            <div className="text-xs text-gray-400">{pkg.tryoutCount ?? 0} tryout</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[getEntityStatus(pkg)]}`}>{STATUS_LABELS[getEntityStatus(pkg)]}</span>
            {pkg.isTrial && <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">Trial</span>}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>✏️</Button>
            <Button variant="outline" size="sm" onClick={() => setShowTryoutSelector(true)}>🎯 Tryout</Button>
            <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>🗑️</Button>
          </div>
        </div>
      )}

      <TryoutSelectorModal
        open={showTryoutSelector}
        onClose={() => setShowTryoutSelector(false)}
        packageId={pkg.id}
        packageName={pkg.name}
      />

      {showConfirm && (
        <Modal open onClose={() => setShowConfirm(false)} title="Hapus Paket?" width={400}>
          <p className="text-sm text-gray-600 mb-4">
            Yakin ingin menghapus <strong>{pkg.name}</strong>? Tindakan ini tidak bisa dibatalkan.
            {deletePackage.error && (
              <span className="block mt-2 text-red-600 font-semibold">{deletePackage.error.message}</span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Batal</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deletePackage.isPending}>
              {deletePackage.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Bank edit card ────────────────────────────────────────────── */
function BankCard({
  bank,
  onUpdated,
  onDeleted,
}: {
  bank: BankAccount;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const updateBank = useUpdateBank();
  const deleteBank = useDeleteBank();

  const [bankName, setBankName] = useState(bank.bankName);
  const [accountNumber, setAccountNumber] = useState(bank.accountNumber);
  const [accountHolder, setAccountHolder] = useState(bank.accountHolder);
  const [isActive, setIsActive] = useState(bank.isActive);
  const [showConfirm, setShowConfirm] = useState(false);

  const save = () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) return;
    updateBank.mutate(
      { id: bank.id, bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim(), isActive },
      { onSuccess: () => onUpdated() }
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Nama Bank</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Nomor Rekening</label>
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-xs font-bold text-gray-500 block mb-1">Atas Nama</label>
          <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" /> Aktif
          </label>
          <Button variant="primary" size="sm" onClick={save} disabled={updateBank.isPending}>
            {updateBank.isPending ? '...' : '💾'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>🗑️</Button>
        </div>
      </div>

      {showConfirm && (
        <Modal open onClose={() => setShowConfirm(false)} title="Hapus Rekening?" width={400}>
          <p className="text-sm text-gray-600 mb-4">
            Yakin ingin menghapus <strong>{bank.bankName} - {bank.accountNumber}</strong>?
            Rekening akan disembunyikan dari halaman pembayaran.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Batal</Button>
            <Button variant="danger" size="sm" onClick={() => deleteBank.mutate(bank.id, { onSuccess: () => { setShowConfirm(false); onDeleted(); } })} disabled={deleteBank.isPending}>
              {deleteBank.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Tryout list card ──────────────────────────────────────────── */
function TryoutCard({
  tryout,
  onEdit,
  onDeleted,
}: {
  tryout: Tryout;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const deleteTryout = useDeleteTryout();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50">
        <div>
          <div className="font-bold text-sm text-brand">
            {tryout.name} {tryout.isTrial && <span className="text-amber-500 text-xs">(Trial)</span>} <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[getEntityStatus(tryout)]}`}>{STATUS_LABELS[getEntityStatus(tryout)]}</span>
          </div>
          <div className="text-xs text-gray-400">
            {tryout.durationMin} menit · {tryout._questionCount || 0} soal · Urutan {tryout.sortOrder}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onEdit}>✏️</Button>
          <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>🗑️</Button>
        </div>
      </div>

      {showConfirm && (
        <Modal open onClose={() => setShowConfirm(false)} title="Hapus Tryout?" width={400}>
          <p className="text-sm text-gray-600 mb-4">
            Yakin ingin menghapus <strong>{tryout.name}</strong>?
            {deleteTryout.error && (
              <span className="block mt-2 text-red-600 font-semibold">{deleteTryout.error.message}</span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Batal</Button>
            <Button variant="danger" size="sm" onClick={() => deleteTryout.mutate(tryout.id, { onSuccess: () => { setShowConfirm(false); onDeleted(); } })} disabled={deleteTryout.isPending}>
              {deleteTryout.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { fetchLogoConfig } = useAppStore();
  const { data: packages = [], isFetching: loadingPkgs, error: pkgsError } = usePackages();

  // Load DB config on mount so brand colors (CSS vars) apply on hard refresh
  useEffect(() => {
    fetchLogoConfig();
  }, [fetchLogoConfig]);
  const { data: banks = [], isFetching: loadingBanks, error: banksError } = useAdminBanks();
  const { data: allTryouts = [], isFetching: loadingTryouts } = useAllTryouts();

  const [showCreatePkg, setShowCreatePkg] = useState(false);
  const [showCreateTryout, setShowCreateTryout] = useState(false);
  const [editTryout, setEditTryout] = useState<Tryout | null>(null);
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [msg, setMsg] = useState('');

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const isLoading = loadingPkgs || loadingBanks || loadingTryouts;

  if (isLoading) {
    return (
      <div>
        <h2 className="font-black text-xl sm:text-2xl text-brand mb-1">⚙️ Pengaturan</h2>
        <p className="text-gray-400 text-sm mb-6">Kelola paket, tryout, dan rekening pembayaran.</p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-2 text-gray-400 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Memuat data...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-black text-xl sm:text-2xl text-brand mb-1">⚙️ Pengaturan</h2>
      <p className="text-gray-400 text-sm mb-6">
        Kelola paket, tryout, dan rekening pembayaran.
      </p>

      {msg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 font-bold text-green-700 text-sm">{msg}</div>
      )}

      {(pkgsError || banksError) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 font-bold text-red-700 text-sm">
          Gagal memuat data.
        </div>
      )}

      {/* ── Packages Section ──────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="font-extrabold text-base text-brand">📦 Paket Tryout</h3>
          <Button variant="primary" size="sm" onClick={() => setShowCreatePkg(true)}>
            + Tambah Paket
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {packages.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada paket. Klik &quot;Tambah Paket&quot; untuk membuat.</p>
          )}
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onUpdated={() => showMsg('✅ Paket berhasil diperbarui')}
              onDeleted={() => showMsg('✅ Paket berhasil dihapus')}
            />
          ))}
        </div>
      </Card>

      <PackageCreateModal open={showCreatePkg} onClose={() => { setShowCreatePkg(false); showMsg('✅ Paket berhasil ditambahkan'); }} />

      {/* ── Tryout Management Section ─────────────────────────── */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="font-extrabold text-base text-brand">🎯 Kelola Tryout</h3>
          <Button variant="primary" size="sm" onClick={() => { setEditTryout(null); setShowCreateTryout(true); }}>
            + Tambah Tryout
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {allTryouts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada tryout.</p>
          )}
          {allTryouts.map((t) => (
            <TryoutCard
              key={t.id}
              tryout={t}
              onEdit={() => { setEditTryout(t); setShowCreateTryout(true); }}
              onDeleted={() => showMsg('✅ Tryout berhasil dihapus')}
            />
          ))}
        </div>
      </Card>

      <TryoutManageModal
        key={editTryout?.id ?? 'create'}
        open={showCreateTryout}
        onClose={() => { setShowCreateTryout(false); setEditTryout(null); showMsg('✅ Tryout berhasil disimpan'); }}
        editTryout={editTryout}
      />

      {/* ── Brand Colors Section ───────────────────────────────── */}
      <BrandColorsCard />

      {/* ── Bank Accounts Section ─────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="font-extrabold text-base text-brand">🏦 Rekening Pembayaran</h3>
          <div className="flex gap-2">
            <Button variant="gold" size="sm" onClick={() => { setMsg(''); setShowCreateBank(true); }}>
              + Tambah Rekening
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {banks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada rekening.</p>
          )}
          {banks.map((b) => (
            <BankCard
              key={b.id}
              bank={b}
              onUpdated={() => showMsg('✅ Rekening berhasil diperbarui')}
              onDeleted={() => showMsg('✅ Rekening berhasil dihapus')}
            />
          ))}
        </div>

        {/* Inline create bank */}
        <InlineBankCreate
          open={showCreateBank}
          onCancel={() => setShowCreateBank(false)}
          onCreated={() => { setShowCreateBank(false); showMsg('✅ Rekening berhasil ditambahkan'); }}
        />
      </Card>
    </div>
  );
}

/* ── Brand Colors Card ──────────────────────────────────────────── */
function BrandColorsCard() {
  const { data: logoConfig } = useLogoConfig();
  const { syncLogoConfig, fetchLogoConfig } = useAppStore();
  const queryClient = useQueryClient();

  // User overrides (null = not yet edited, fall back to DB/default)
  const [userPrimary, setUserPrimary] = useState<string | null>(null);
  const [userSecondary, setUserSecondary] = useState<string | null>(null);
  const [userDark, setUserDark] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const themePrimary = userPrimary ?? logoConfig?.themePrimary ?? '#1B3A6B';
  const themeSecondary = userSecondary ?? logoConfig?.themeSecondary ?? '#2563EB';
  const themeDark = userDark ?? logoConfig?.themeDark ?? '#0C1E45';

  const presets = [
    { name: 'FIX ASN Default', primary: '#1B3A6B', secondary: '#2563EB', dark: '#0C1E45' },
    { name: 'Hijau', primary: '#065F46', secondary: '#10B981', dark: '#022C22' },
    { name: 'Ungu', primary: '#5B21B6', secondary: '#8B5CF6', dark: '#2E1065' },
    { name: 'Merah', primary: '#991B1B', secondary: '#EF4444', dark: '#450A0A' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const { setLogoConfig } = useAppStore.getState();
      setLogoConfig((prev) => ({
        ...prev,
        themePrimary,
        themeSecondary,
        themeDark,
      }));
      const ok = await syncLogoConfig();
      if (ok) {
        await fetchLogoConfig();
        queryClient.invalidateQueries({ queryKey: ['logo-config'] });
        setUserPrimary(null);
        setUserSecondary(null);
        setUserDark(null);
        toast.success('Warna brand berhasil disimpan!');
      } else {
        toast.error('Gagal menyimpan konfigurasi.');
      }
    } catch {
      toast.error('Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="font-extrabold text-base text-brand">🎨 Warna Brand</h3>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Menyimpan…' : '💾 Simpan'}
        </Button>
      </div>

      <p className="text-xs text-gray-400 mb-5">
        Ubah warna utama yang digunakan di seluruh halaman. Perubahan langsung terlihat setelah disimpan.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {/* Primary Color */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Warna Primer</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              value={themePrimary}
              onChange={(e) => setUserPrimary(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300 p-0.5 flex-shrink-0"
            />
            <input
              value={themePrimary}
              onChange={(e) => setUserPrimary(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Warna Sekunder</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              value={themeSecondary}
              onChange={(e) => setUserSecondary(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300 p-0.5 flex-shrink-0"
            />
            <input
              value={themeSecondary}
              onChange={(e) => setUserSecondary(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
            />
          </div>
        </div>

        {/* Dark Color */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Warna Gelap</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              value={themeDark}
              onChange={(e) => setUserDark(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300 p-0.5 flex-shrink-0"
            />
            <input
              value={themeDark}
              onChange={(e) => setUserDark(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Live preview strip */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">👁 Preview</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Primary swatch */}
          <div
            className="flex-1 rounded-xl p-4 flex flex-col gap-1.5"
            style={{ background: `linear-gradient(135deg, ${themePrimary}, ${themeSecondary})` }}
          >
            <span className="text-xs text-white/60 font-bold">Gradient Hero</span>
            <span className="text-sm font-extrabold text-white">Judul Halaman</span>
            <span className="text-[10px] text-white/70">Subjudul dan deskripsi konten</span>
          </div>
          {/* Dark swatch */}
          <div
            className="sm:w-32 rounded-xl p-4 flex flex-col gap-1.5"
            style={{ background: `linear-gradient(180deg, ${themeDark}, ${themePrimary})` }}
          >
            <span className="text-[10px] text-white/50 font-bold">Sidebar</span>
            <div className="flex flex-col gap-1">
              <div className="h-1.5 rounded bg-white/15 w-full" />
              <div className="h-1.5 rounded bg-white/10 w-3/4" />
              <div className="h-1.5 rounded bg-white/10 w-1/2" />
            </div>
          </div>
          {/* Button swatch */}
          <div className="sm:w-28 rounded-xl border border-gray-100 p-3 flex flex-col gap-1.5 items-center justify-center">
            <span className="text-[10px] text-gray-400 font-bold">Button</span>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${themePrimary}, ${themeSecondary})` }}
            >
              CTA
            </div>
            <div
              className="px-3 py-1 rounded-lg text-[10px] font-bold border"
              style={{ borderColor: themePrimary, color: themePrimary }}
            >
              Outline
            </div>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          🎨 Preset Cepat
        </p>
        <div className="flex gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setUserPrimary(p.primary);
                setUserSecondary(p.secondary);
                setUserDark(p.dark);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-full text-xs font-bold bg-white cursor-pointer hover:border-blue-400 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ── Inline bank create ────────────────────────────────────────── */
function InlineBankCreate({ open, onCancel, onCreated }: { open: boolean; onCancel: () => void; onCreated: () => void }) {
  const createBank = useCreateBank();

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('CV. FIX ASN INDONESIA');
  const [isActive, setIsActive] = useState(true);

  if (!open) return null;

  const save = () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) return;
    createBank.mutate(
      { bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim(), isActive },
      {
        onSuccess: () => {
          setBankName('');
          setAccountNumber('');
          setAccountHolder('CV. FIX ASN INDONESIA');
          setIsActive(true);
          onCreated();
        },
      }
    );
  };

  return (
    <div className="mt-4 border border-amber-200 rounded-xl bg-amber-50 p-4">
      <div className="font-bold text-sm text-amber-700 mb-3">Rekening Baru</div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Nama Bank</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-bold" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Nomor Rekening</label>
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-xs font-bold text-gray-500 block mb-1">Atas Nama</label>
          <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm" />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" /> Aktif
          </label>
          <Button variant="primary" size="sm" onClick={save} disabled={createBank.isPending}>
            {createBank.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>Batal</Button>
        </div>
      </div>
      {createBank.error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-2">{createBank.error.message}</div>}
    </div>
  );
}
