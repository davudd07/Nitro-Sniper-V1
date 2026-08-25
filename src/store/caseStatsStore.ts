import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CASES } from "../data/cases";

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seedOfficialOpens(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CASES) {
    out[c.id] = 420 + (hashId(c.id) % 8600);
  }
  return out;
}

interface CaseStatsState {
  opensByCase: Record<string, number>;
  addOpens: (caseId: string, n: number) => void;
  opensFor: (caseId: string) => number;
}

export const useCaseStatsStore = create<CaseStatsState>()(
  persist(
    (set, get) => ({
      opensByCase: seedOfficialOpens(),
      addOpens: (caseId, n) => {
        if (!caseId || !(n > 0)) return;
        set((s) => ({
          opensByCase: { ...s.opensByCase, [caseId]: (s.opensByCase[caseId] ?? 0) + n },
        }));
      },
      opensFor: (caseId) => get().opensByCase[caseId] ?? 0,
    }),
    { name: "prism-vault-case-stats-v1" },
  ),
);

export function noteOfficialCaseOpens(caseId: string, paidOpens: number): void {
  useCaseStatsStore.getState().addOpens(caseId, paidOpens);
}
