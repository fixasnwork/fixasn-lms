import type { Package, BankAccount, TryoutSet } from "@/lib/types";

export const DEFAULT_PACKAGES: Package[] = [
  { id: "p1", name: "Paket Starter",      tryouts: 3,  price: 45000,  desc: "3 Paket Tryout SKD",                            popular: false, video: false, comingSoon: false },
  { id: "p2", name: "Paket Intensif",     tryouts: 7,  price: 90000,  desc: "7 Paket Tryout SKD",                            popular: true,  video: false, comingSoon: false },
  { id: "p3", name: "Paket Komplit",      tryouts: 10, price: 145000, desc: "10 Paket Tryout SKD",                           popular: false, video: false, comingSoon: false },
  { id: "p4", name: "Paket Video Belajar",tryouts: 0,  price: 250000, desc: "Video Lengkap TWK + TIU + TKP + Modul Download", popular: false, video: true,  comingSoon: true  },
];

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: "b1", bank: "BCA",     norek: "1234567890", atas: "CV. FIX ASN INDONESIA" },
  { id: "b2", bank: "Mandiri", norek: "0987654321", atas: "CV. FIX ASN INDONESIA" },
  { id: "b3", bank: "BNI",     norek: "1122334455", atas: "CV. FIX ASN INDONESIA" },
];

export const DEFAULT_TRYOUT_SETS: TryoutSet[] = [
  { id:"set-a", name:"Tryout 1", label:"Set A", questions: [] },
  { id:"set-b", name:"Tryout 2", label:"Set B", questions: [] },
];
