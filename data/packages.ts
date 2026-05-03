import type { Package, BankAccount } from "@/lib/types";

const NOW = new Date().toISOString();

export const DEFAULT_PACKAGES: Omit<Package, "id">[] = [
  { name: "Paket Starter",      description: "3 Paket Tryout SKD",                            price: 45000,  isTrial: true,  isActive: true, createdAt: NOW, updatedAt: NOW },
  { name: "Paket Intensif",     description: "7 Paket Tryout SKD",                            price: 90000,  isTrial: false, isActive: true, createdAt: NOW, updatedAt: NOW },
  { name: "Paket Komplit",      description: "10 Paket Tryout SKD",                           price: 145000, isTrial: false, isActive: true, createdAt: NOW, updatedAt: NOW },
  { name: "Paket Video Belajar", description: "Video Lengkap TWK + TIU + TKP + Modul Download", price: 250000, isTrial: false, isActive: true, createdAt: NOW, updatedAt: NOW },
];

export const DEFAULT_BANK_ACCOUNTS: Omit<BankAccount, "id">[] = [
  { bankName: "BCA",     accountNumber: "1234567890", accountHolder: "CV. FIX ASN INDONESIA", isActive: true, createdAt: NOW, updatedAt: NOW },
  { bankName: "Mandiri", accountNumber: "0987654321", accountHolder: "CV. FIX ASN INDONESIA", isActive: true, createdAt: NOW, updatedAt: NOW },
  { bankName: "BNI",     accountNumber: "1122334455", accountHolder: "CV. FIX ASN INDONESIA", isActive: true, createdAt: NOW, updatedAt: NOW },
];

// Question bank imports — used by seed script to create tryouts
export { QUESTIONS } from "./questions-set-a";
export { QUESTIONS_B } from "./questions-set-b";
