import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAdminViewUnlock, hasAdminSession, hasAdminViewUnlock } from "../lib/adminAuth";

interface AdminViewState {
  active: boolean;
  enter: () => boolean;
  exit: () => void;
}

export const useAdminViewStore = create<AdminViewState>()(
  persist(
    (set) => ({
      active: false,
      enter: () => {
        if (!hasAdminSession() || !hasAdminViewUnlock()) return false;
        set({ active: true });
        return true;
      },
      exit: () => {
        clearAdminViewUnlock();
        set({ active: false });
      },
    }),
    { name: "prism-vault-admin-view" },
  ),
);
