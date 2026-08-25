import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CatalogModerationState {
  hiddenOfficialIds: string[];
  isOfficialHidden: (id: string) => boolean;
  hideOfficial: (id: string) => void;
  restoreOfficial: (id: string) => void;
}

export const useCatalogModerationStore = create<CatalogModerationState>()(
  persist(
    (set, get) => ({
      hiddenOfficialIds: [],
      isOfficialHidden: (id) => get().hiddenOfficialIds.includes(id),
      hideOfficial: (id) => {
        if (get().hiddenOfficialIds.includes(id)) return;
        set({ hiddenOfficialIds: [...get().hiddenOfficialIds, id] });
      },
      restoreOfficial: (id) => {
        set({ hiddenOfficialIds: get().hiddenOfficialIds.filter((x) => x !== id) });
      },
    }),
    { name: "prism-vault-catalog-moderation" },
  ),
);
