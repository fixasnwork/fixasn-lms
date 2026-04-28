'use client';

import { useState } from 'react';
import type { Payment } from '@/lib/types';
import { Button, Badge, Card, Modal, StatCard } from '@/components/ui';

// Sample payment data for admin demo
const SAMPLE_PAYMENTS: Payment[] = [
  { id: 'PAY001', userId: 'u1', userName: 'Rizki Andalas', email: 'rizki@gmail.com', pkg: 'Paket Intensif (7 sesi)', amount: 90000, status: 'pending', date: '15 Apr 2026', proofUrl: 'https://placehold.co/400x220/dbeafe/1d4ed8?text=Bukti+Transfer+BCA' },
  { id: 'PAY002', userId: 'u2', userName: 'Maya Putri', email: 'maya.putri@yahoo.com', pkg: 'Paket Komplit (10 sesi)', amount: 145000, status: 'verified', date: '14 Apr 2026', proofUrl: 'https://placehold.co/400x220/dcfce7/15803d?text=Bukti+Transfer+Mandiri' },
  { id: 'PAY003', userId: 'u3', userName: 'Doni Prasetyo', email: 'doni.p@outlook.com', pkg: 'Paket Starter (3 sesi)', amount: 45000, status: 'blocked', date: '13 Apr 2026', proofUrl: 'https://placehold.co/400x220/fef9c3/854d0e?text=Bukti+Transfer+BNI' },
  { id: 'PAY004', userId: 'u4', userName: 'Siti Aminah', email: 'siti.aminah@gmail.com', pkg: 'Paket Intensif (7 sesi)', amount: 90000, status: 'pending', date: '15 Apr 2026', proofUrl: 'https://placehold.co/400x220/dbeafe/1d4ed8?text=Bukti+Transfer+BCA' },
  { id: 'PAY005', userId: 'u5', userName: 'Ahmad Fauzi', email: 'ahmad.fauzi@gmail.com', pkg: 'Paket Komplit (10 sesi)', amount: 145000, status: 'verified', date: '14 Apr 2026', proofUrl: 'https://placehold.co/400x220/dcfce7/15803d?text=Bukti+Transfer+Mandiri' },
  { id: 'PAY006', userId: 'u6', userName: 'Wati Rohmah', email: 'wati.r@gmail.com', pkg: 'Paket Starter (3 sesi)', amount: 45000, status: 'pending', date: '15 Apr 2026', proofUrl: 'https://placehold.co/400x220/dbeafe/1d4ed8?text=Bukti+Transfer+BCA' },
  { id: 'PAY007', userId: 'u7', userName: 'Budi Santoso', email: 'budi.s@gmail.com', pkg: 'Paket Intensif (7 sesi)', amount: 90000, status: 'verified', date: '13 Apr 2026', proofUrl: 'https://placehold.co/400x220/dcfce7/15803d?text=Bukti+Transfer+Mandiri' },
  { id: 'PAY008', userId: 'u8', userName: 'Rina Hartati', email: 'rina.h@gmail.com', pkg: 'Paket Komplit (10 sesi)', amount: 145000, status: 'pending', date: '15 Apr 2026', proofUrl: 'https://placehold.co/400x220/dbeafe/1d4ed8?text=Bukti+Transfer+BCA' },
];

type FilterKey = 'all' | 'pending' | 'verified' | 'blocked';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(SAMPLE_PAYMENTS);
  const [filterPay, setFilterPay] = useState<FilterKey>('all');
  const [proofModal, setProofModal] = useState<Payment | null>(null);
  const [blockModal, setBlockModal] = useState<Payment | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>(['u3']);

  const filtered =
    filterPay === 'all'
      ? payments
      : payments.filter((p) => p.status === filterPay);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const verifiedCount = payments.filter((p) => p.status === 'verified').length;
  const blockedCount = payments.filter((p) => p.status === 'blocked').length;
  const totalVerified = payments
    .filter((p) => p.status === 'verified')
    .reduce((s, p) => s + p.amount, 0);

  const verify = (id: string) =>
    setPayments((p) => p.map((x) => (x.id === id ? { ...x, status: 'verified' } : x)));

  const blockUser = (pay: Payment) => {
    setBlockedUsers((p) => [...p, pay.userId]);
    setPayments((p) =>
      p.map((x) =>
        x.userId === pay.userId ? { ...x, status: 'blocked' } : x
      )
    );
    setBlockModal(null);
    setBlockReason('');
  };

  const unblock = (userId: string) => {
    setBlockedUsers((p) => p.filter((id) => id !== userId));
    setPayments((p) =>
      p.map((x) =>
        x.userId === userId ? { ...x, status: 'pending' } : x
      )
    );
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'verified', label: '✅ Verified' },
    { key: 'blocked', label: '🚫 Diblokir' },
  ];

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-5">
        💳 Verifikasi Pembayaran
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard icon="⏳" label="Pending" value={pendingCount} color="#D97706" />
        <StatCard icon="✅" label="Verified" value={verifiedCount} color="#16A34A" />
        <StatCard icon="🚫" label="Diblokir" value={blockedCount} color="#DC2626" />
        <StatCard
          icon="💰"
          label="Total Verified"
          value={`Rp ${totalVerified.toLocaleString('id-ID')}`}
          color="#2563EB"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterPay(key)}
            className={`px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer border-2 transition-all ${
              filterPay === key
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-500 hover:border-blue-400'
            }`}
          >
            {label} (
            {key === 'all' ? payments.length : payments.filter((p) => p.status === key).length})
          </button>
        ))}
      </div>

      {/* Payment list */}
      <div className="flex flex-col gap-3.5">
        {filtered.map((p) => {
          const statusColor =
            p.status === 'verified'
              ? '#16A34A'
              : p.status === 'blocked'
                ? '#DC2626'
                : '#F59E0B';
          return (
            <Card key={p.id} className="border-l-4" style={{ borderLeftColor: statusColor }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-3.5 items-center flex-1">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 text-white"
                    style={{
                      background:
                        p.status === 'blocked'
                          ? '#FEE2E2'
                          : 'linear-gradient(135deg,#1B3A6B,#2563EB)',
                      color: p.status === 'blocked' ? '#DC2626' : '#fff',
                      fontSize: p.status === 'blocked' ? '20px' : '17px',
                    }}
                  >
                    {p.status === 'blocked' ? '🚫' : p.userName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-extrabold text-base text-gray-800">
                        {p.userName}
                      </span>
                      <Badge
                        color={
                          p.status === 'verified'
                            ? 'green'
                            : p.status === 'blocked'
                              ? 'red'
                              : 'yellow'
                        }
                      >
                        {p.status === 'verified'
                          ? '✓ Verified'
                          : p.status === 'blocked'
                            ? '🚫 Diblokir'
                            : '⏳ Pending'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">{p.pkg}</div>
                    <div className="text-xs text-gray-400">
                      {p.email} · {p.date} · {p.id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-black text-xl text-[#1B3A6B]">
                      Rp {p.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[130px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProofModal(p)}
                    >
                      📄 Lihat Bukti TF
                    </Button>
                    {p.status === 'pending' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => verify(p.id)}
                        >
                          ✓ Konfirmasi Sah
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setBlockModal(p);
                            setBlockReason('');
                          }}
                        >
                          🚫 Blokir User
                        </Button>
                      </>
                    )}
                    {p.status === 'verified' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setBlockModal(p);
                          setBlockReason('');
                        }}
                      >
                        🚫 Blokir User
                      </Button>
                    )}
                    {p.status === 'blocked' && (
                      <Button variant="success" size="sm" onClick={() => unblock(p.userId)}>
                        ↩ Buka Blokir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-base">Tidak ada data</p>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {proofModal && (
        <Modal
          open
          title={`Bukti Transfer — ${proofModal.userName}`}
          onClose={() => setProofModal(null)}
          width={480}
        >
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              ['Nama', proofModal.userName],
              ['Paket', proofModal.pkg],
              ['Nominal', `Rp ${proofModal.amount.toLocaleString('id-ID')}`],
              ['Tanggal', proofModal.date],
            ].map(([label, val]) => (
              <div key={label} className="bg-blue-50 rounded-lg p-2.5">
                <div className="text-xs text-gray-400 font-bold mb-0.5">{label}</div>
                <div className="text-sm font-extrabold text-[#1B3A6B]">{val}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl overflow-hidden border-2 border-gray-100 mb-4">
            <img
              src={proofModal.proofUrl}
              alt="Bukti"
              className="w-full block"
            />
            <div className="px-3 py-2 bg-blue-50 text-center text-xs text-gray-500">
              📎 {proofModal.id}_bukti_transfer.jpg
            </div>
          </div>
          {proofModal.status === 'pending' && (
            <div className="flex gap-2.5">
              <Button
                variant="success"
                className="flex-1"
                onClick={() => {
                  verify(proofModal.id);
                  setProofModal(null);
                }}
              >
                ✓ Konfirmasi Sah
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setProofModal(null);
                  setBlockModal(proofModal);
                  setBlockReason('');
                }}
              >
                🚫 Tidak Valid → Blokir
              </Button>
            </div>
          )}
          {proofModal.status === 'verified' && (
            <div className="text-center">
              <Badge color="green">✓ Sudah diverifikasi</Badge>
            </div>
          )}
          {proofModal.status === 'blocked' && (
            <div className="text-center">
              <Badge color="red">🚫 User diblokir</Badge>
            </div>
          )}
        </Modal>
      )}

      {/* Block Modal */}
      {blockModal && (
        <Modal
          open
          title="⚠️ Konfirmasi Blokir User"
          onClose={() => {
            setBlockModal(null);
            setBlockReason('');
          }}
          width={420}
        >
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4">
            <p className="font-bold text-red-600 text-sm mb-1">⚠️ Kamu akan memblokir:</p>
            <p className="font-black text-lg text-gray-800 mb-0.5">{blockModal.userName}</p>
            <p className="text-sm text-gray-500 m-0">{blockModal.email}</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            User yang diblokir tidak dapat login dan semua akses dicabut. Tindakan ini dapat
            dibatalkan kapan saja.
          </p>
          <label className="text-sm font-bold text-gray-700 block mb-2">
            Alasan Blokir <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Contoh: Bukti transfer tidak valid / gambar tidak jelas / diduga palsu..."
            className="w-full p-2.5 border border-red-200 rounded-lg text-sm resize-none mb-4"
          />
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setBlockModal(null);
                setBlockReason('');
              }}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={!blockReason.trim()}
              onClick={() => blockUser(blockModal)}
            >
              🚫 Ya, Blokir Sekarang
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}