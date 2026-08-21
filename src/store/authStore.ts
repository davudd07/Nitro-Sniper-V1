import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  emailIssue,
  hashPlayerPassword,
  normalizeUsername,
  passwordIssue,
  usernameIssue,
} from "../lib/playerAuth";
import { useDemoProfileStore } from "./demoProfileStore";

export interface PlayerAccount {
  username: string;
  passwordHash: string;
  email: string;
  createdAt: number;
}

interface AuthState {
  accounts: PlayerAccount[];
  session: string | null;
  gateOpen: boolean;
  hasPrompted: boolean;
  openGate: () => void;
  closeGate: () => void;
  promptOnce: () => void;
  register: (username: string, password: string, email?: string) => Promise<string | null>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  requireAccount: () => boolean;
  renameAccount: (current: string, nextUsername: string) => string | null;
  setAccountPassword: (username: string, nextPassword: string) => Promise<string | null>;
  setAccountEmail: (username: string, email: string) => string | null;
}

function findAccount(accounts: PlayerAccount[], username: string) {
  const key = username.trim().toLowerCase();
  return accounts.find((a) => a.username.toLowerCase() === key);
}

function applySessionName(username: string) {
  useDemoProfileStore.getState().setDisplayName(username);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: [],
      session: null,
      gateOpen: false,
      hasPrompted: false,
      openGate: () => set({ gateOpen: true }),
      closeGate: () => set({ gateOpen: false, hasPrompted: true }),
      promptOnce: () => {
        const { session, hasPrompted } = get();
        if (session || hasPrompted) return;
        set({ gateOpen: true });
      },
      requireAccount: () => {
        if (get().session) return true;
        set({ gateOpen: true });
        return false;
      },
      register: async (username, password, email = "") => {
        const nameErr = usernameIssue(username);
        if (nameErr) return nameErr;
        const passErr = passwordIssue(password);
        if (passErr) return passErr;
        const mailErr = emailIssue(email);
        if (mailErr) return mailErr;
        const name = normalizeUsername(username);
        if (findAccount(get().accounts, name)) return "That username is taken.";
        const passwordHash = await hashPlayerPassword(password);
        const account: PlayerAccount = {
          username: name,
          passwordHash,
          email: email.trim(),
          createdAt: Date.now(),
        };
        set((s) => ({
          accounts: [...s.accounts, account],
          session: name,
          gateOpen: false,
          hasPrompted: true,
        }));
        applySessionName(name);
        return null;
      },
      login: async (username, password) => {
        const name = normalizeUsername(username);
        const acc = findAccount(get().accounts, name);
        if (!acc) return "Unknown username.";
        const hash = await hashPlayerPassword(password);
        if (hash !== acc.passwordHash) return "Wrong password.";
        set({ session: acc.username, gateOpen: false, hasPrompted: true });
        applySessionName(acc.username);
        return null;
      },
      logout: () => set({ session: null }),
      renameAccount: (current, nextUsername) => {
        const nameErr = usernameIssue(nextUsername);
        if (nameErr) return nameErr;
        const next = normalizeUsername(nextUsername);
        const { accounts, session } = get();
        const acc = findAccount(accounts, current);
        if (!acc) return "Account not found.";
        if (acc.username.toLowerCase() !== next.toLowerCase() && findAccount(accounts, next)) {
          return "That username is taken.";
        }
        set({
          accounts: accounts.map((a) => (a.username === acc.username ? { ...a, username: next } : a)),
          session: session && session.toLowerCase() === acc.username.toLowerCase() ? next : session,
        });
        if (session && session.toLowerCase() === acc.username.toLowerCase()) applySessionName(next);
        return null;
      },
      setAccountPassword: async (username, nextPassword) => {
        const passErr = passwordIssue(nextPassword);
        if (passErr) return passErr;
        const acc = findAccount(get().accounts, username);
        if (!acc) return "Account not found.";
        const passwordHash = await hashPlayerPassword(nextPassword);
        set((s) => ({
          accounts: s.accounts.map((a) => (a.username === acc.username ? { ...a, passwordHash } : a)),
        }));
        return null;
      },
      setAccountEmail: (username, email) => {
        const mailErr = emailIssue(email);
        if (mailErr) return mailErr;
        const acc = findAccount(get().accounts, username);
        if (!acc) return "Account not found.";
        set((s) => ({
          accounts: s.accounts.map((a) => (a.username === acc.username ? { ...a, email: email.trim() } : a)),
        }));
        return null;
      },
    }),
    {
      name: "prism-vault-auth",
      partialize: (s) => ({
        accounts: s.accounts,
        session: s.session,
        hasPrompted: s.hasPrompted,
      }),
    },
  ),
);
