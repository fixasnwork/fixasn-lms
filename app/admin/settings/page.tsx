'use client';

import { useState } from 'react';
import type { Package, Tryout, BankAccount } from '@/lib/types';
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
  const { data: assigned = [], isFetching: loadingAssigned } = usePackageTryouts(packageId);
  const setTryouts = useSetPackageTryouts();

  const assignedIds = new Set(assigned.map((t) => t.id));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(assignedIds);

  // Sync selectedIds when assigned data loads
  if (!loadingAssigned && (selectedIds.size !== assignedIds.size || ![...selectedIds].every((id) => assignedIds.has(id)))) {
    setSelectedIds(new Set(assignedIds));
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
                <div className="font-bold text-sm text-[#1B3A6B]">
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

  const isEditing = !!editTryout;

  const save = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), isTrial, sortOrder, durationMin };
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
  const [isActive, setIsActive] = useState(true);

  const save = () => {
    if (!name.trim()) return;
    createPackage.mutate(
      { name: name.trim(), description: description.trim(), price, isTrial, isActive },
      { onSuccess: () => { onClose(); setName(''); setDescription(''); setPrice(0); setIsTrial(false); setIsActive(true); } }
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
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" /> Aktif
              </label>
            </div>
          </div>
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
  const [isActive, setIsActive] = useState(pkg.isActive);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTryoutSelector, setShowTryoutSelector] = useState(false);

  const saveEdit = () => {
    if (!name.trim()) return;
    updatePackage.mutate(
      { id: pkg.id, name: name.trim(), description: description.trim(), price, isTrial, isActive },
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
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" /> Aktif
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="w-4 h-4" /> Trial
              </label>
            </div>
          </div>
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
            <div className="font-extrabold text-sm text-[#1B3A6B]">{pkg.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{pkg.description || '—'}</div>
          </div>
          <div>
            <div className="font-bold text-sm">Rp {pkg.price.toLocaleString()}</div>
            <div className="text-xs text-gray-400">{pkg.tryoutCount ?? 0} tryout</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!pkg.isActive && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">Nonaktif</span>}
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
          <div className="font-bold text-sm text-[#1B3A6B]">
            {tryout.name} {tryout.isTrial && <span className="text-amber-500 text-xs">(Trial)</span>}
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
  const { data: packages = [], isFetching: loadingPkgs, error: pkgsError } = usePackages();
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
        <h2 className="font-black text-xl sm:text-2xl text-[#1B3A6B] mb-1">⚙️ Pengaturan</h2>
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
      <h2 className="font-black text-xl sm:text-2xl text-[#1B3A6B] mb-1">⚙️ Pengaturan</h2>
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
          <h3 className="font-extrabold text-base text-[#1B3A6B]">📦 Paket Tryout</h3>
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
          <h3 className="font-extrabold text-base text-[#1B3A6B]">🎯 Kelola Tryout</h3>
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

      {/* ── Bank Accounts Section ─────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="font-extrabold text-base text-[#1B3A6B]">🏦 Rekening Pembayaran</h3>
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
