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
  updatedAt: number;
  messages: SupportMessage[];
}

interface SupportState {
  tickets: SupportTicket[];
  lastTicketId: string | null;
  seenAt: Record<string, number>;
  openTicket: (subject: string, body: string, from?: string) => string;
  reply: (ticketId: string, text: string, from: SupportAuthor) => void;
  closeTicket: (ticketId: string) => void;
  reopenTicket: (ticketId: string) => void;
  setLastTicketId: (id: string | null) => void;
  markSeen: (ticketId: string) => void;
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set) => ({
      tickets: [],
      lastTicketId: null,
      seenAt: {},
      openTicket: (subject, body, from = "You") => {
        const subj = subject.trim().slice(0, 80) || "Support request";
        const text = body.trim().slice(0, 1000);
        if (!text) return "";
        const id = shortId("tkt");
        const now = Date.now();
        const ticket: SupportTicket = {
          id,
          from,
          subject: subj,
          status: "open",
          createdAt: now,
          updatedAt: now,
          messages: [{ id: shortId("msg"), from: "user", text, at: now }],
        };
        set((s) => ({
          tickets: [ticket, ...s.tickets].slice(0, 80),
          lastTicketId: id,
          seenAt: { ...s.seenAt, [id]: now },
        }));
        return id;
      },
      reply: (ticketId, text, from) => {
        const trimmed = text.trim().slice(0, 1000);
        if (!trimmed) return;
        const now = Date.now();
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: from === "user" ? "open" : t.status,
                  updatedAt: now,
                  messages: [...t.messages, { id: shortId("msg"), from, text: trimmed, at: now }],
                }
              : t,
          ),
          lastTicketId: ticketId,
        }));
      },
      closeTicket: (ticketId) => {
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, status: "closed", updatedAt: Date.now() } : t,
          ),
        }));
      },
      reopenTicket: (ticketId) => {
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, status: "open", updatedAt: Date.now() } : t,
          ),
        }));
      },
      setLastTicketId: (id) => set({ lastTicketId: id }),
      markSeen: (ticketId) =>
        set((s) => ({ seenAt: { ...s.seenAt, [ticketId]: Date.now() } })),
    }),
    { name: "prism-vault-support" },
  ),
);

export function openSupportCount(tickets: SupportTicket[] = useSupportStore.getState().tickets) {
  return tickets.filter((t) => t.status === "open").length;
}

export function ticketHasUnread(t: SupportTicket, seenAt: Record<string, number>): boolean {
  const last = t.messages[t.messages.length - 1];
  if (!last || last.from !== "warden") return false;
  return last.at > (seenAt[t.id] ?? 0);
}
