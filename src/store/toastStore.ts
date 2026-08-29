import { create } from "zustand";
import { shortId } from "../lib/format";

export interface Toast {
  id: string;
  message: string;
  tone: "info" | "success" | "warning" | "danger";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = shortId("toast");
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
