// ─────────────────────────────────────────────
// LOCALSTORAGE-BACKED PAYMENT PERSISTENCE
// Bridges frontend payment flow until real backend exists
// ─────────────────────────────────────────────
import type { Payment } from '@/lib/types';

const STORAGE_KEY = 'fixasn-payments';

function readAll(): Payment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(payments: Payment[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
}

export function getPayments(): Payment[] {
  return readAll();
}

export function addPayment(payment: Omit<Payment, 'createdAt' | 'updatedAt'>): void {
  const payments = readAll();
  const now = new Date().toISOString();
  payments.unshift({ ...payment, createdAt: now, updatedAt: now } as Payment);
  writeAll(payments);
}

export function updatePaymentStatus(
  id: string,
  status: Payment['status'],
  blockReason?: string
): void {
  const payments = readAll();
  const target = payments.find((p) => p.id === id);
  if (target) {
    // Update all payments from same user
    payments.forEach((p) => {
      if (p.userId === target.userId) {
        p.status = status;
        if (status === 'blocked' && blockReason) {
          p.blockReason = blockReason;
        } else if (status !== 'blocked') {
          p.blockReason = null;
        }
      }
    });
    writeAll(payments);
  }
}

export function generatePaymentId(): string {
  return `PAY${Date.now().toString(36).toUpperCase()}`;
}
