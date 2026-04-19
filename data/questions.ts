// ─────────────────────────────────────────────
// QUESTION BANKS INDEX
// ─────────────────────────────────────────────
export { QUESTIONS } from "./questions-set-a";
export { QUESTIONS_B } from "./questions-set-b";

// Package banks structure
import type { Tryout } from "@/lib/types";
import { QUESTIONS as Q } from "./questions-set-a";
import { QUESTIONS_B as QB } from "./questions-set-b";

export const DEFAULT_PACKAGE_BANKS: Record<string, Tryout[]> = {
  // Bank soal Paket Starter (3 tryout)
  "p1": [
    { id:"p1-t1", name:"Tryout 1", questions: Q },
    { id:"p1-t2", name:"Tryout 2", questions: QB },
    { id:"p1-t3", name:"Tryout 3", questions: [] },
  ],
  // Bank soal Paket Intensif (7 tryout)
  "p2": Array.from({length:7}, (_,i) => ({
    id: `p2-t${i+1}`,
    name: `Tryout ${i+1}`,
    questions: i===0 ? Q : i===1 ? QB : [],
  })),
  // Bank soal Paket Komplit (10 tryout)
  "p3": Array.from({length:10}, (_,i) => ({
    id: `p3-t${i+1}`,
    name: `Tryout ${i+1}`,
    questions: i===0 ? Q : i===1 ? QB : [],
  })),
};
