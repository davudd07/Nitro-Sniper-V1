import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shortId } from "../lib/format";

export type SupportStatus = "open" | "closed";
export type SupportAuthor = "user" | "warden";

export interface SupportMessage {
  id: string;
  from: SupportAuthor;
  text: string;
  at: number;
}

export interface SupportTicket {
  id: string;
  from: string;
  subject: string;
  status: SupportStatus;
  createdAt: number;
  messages: SupportMessage[];
}

interface SupportState {
  tickets: SupportTicket[];
  openTicket: (subject: string, body: string, from?: string) => string;
  reply: (ticketId: string, text: string, from: SupportAuthor) => void;
  closeTicket: (ticketId: string) => void;
  reopenTicket: (ticketId: string) => void;
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set) => ({
      tickets: [],
      openTicket: (subject, body, from = "You") => {
        const subj = subject.trim().slice(0, 80) || "Support request";
        const text = body.trim().slice(0, 1000);
        if (!text) return "";
        const id = shortId("tkt");
        const ticket: SupportTicket = {
          id,
          from,
          subject: subj,
          status: "open",
          createdAt: Date.now(),
          messages: [{ id: shortId("msg"), from: "user", text, at: Date.now() }],
        };
        set((s) => ({ tickets: [ticket, ...s.tickets].slice(0, 80) }));
        return id;
      },
      reply: (ticketId, text, from) => {
        const trimmed = text.trim().slice(0, 1000);
        if (!trimmed) return;
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: t.status === "closed" && from === "user" ? "open" : t.status,
                  messages: [...t.messages, { id: shortId("msg"), from, text: trimmed, at: Date.now() }],
                }
              : t,
          ),
        }));
      },
      closeTicket: (ticketId) => {
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status: "closed" } : t)),
        }));
      },
      reopenTicket: (ticketId) => {
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status: "open" } : t)),
        }));
      },
    }),
    { name: "prism-vault-support" },
  ),
);

export function openSupportCount(tickets: SupportTicket[] = useSupportStore.getState().tickets) {
  return tickets.filter((t) => t.status === "open").length;
}
