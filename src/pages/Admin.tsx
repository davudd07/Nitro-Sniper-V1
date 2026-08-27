import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Coins, Crown, Eye, Gift, Headphones, KeyRound, Lock, LogOut, MessageSquare, Package, Search, Shield, Unlock, Volume2, VolumeX, Wallet } from "lucide-react";
import { clsx } from "clsx";
import {
  clearAdminSession,
  hasAdminSession,
  persistAdminSession,
  persistAdminViewUnlock,
  verifyAdminLogin,
} from "../lib/adminAuth";
import { useAdminViewStore } from "../store/adminViewStore";
import {
  LOCAL_PLAYER,
  MODERATION_PLAYERS,
  useModerationStore,
} from "../store/moderationStore";
import { useEconomyStore } from "../store/economyStore";
import { ACTIVITY_GAMES, ACTIVITY_GAME_LABELS, useActivityStore, type ActivityGame } from "../store/activityStore";
import { useChatStore } from "../store/chatStore";
import { useSupportStore, type SupportTicket } from "../store/supportStore";
import { formatCredits, formatCash, formatFunCoins, formatPlayCash, formatRakeback, formatXp } from "../lib/format";
import { sound } from "../lib/sound";
import { useToastStore } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { VipDesk } from "../components/admin/VipDesk";
import { CasesDesk } from "../components/admin/CasesDesk";
import { LOCAL_XP_USER, resolveVip, sortedTiers } from "../lib/loyalty";
import { useIdentityStore } from "../store/identityStore";
import { VISUAL_ROLE_LIST, type VisualRole } from "../lib/identity";
import { RoleBadge } from "../components/identity/RoleBadge";
import { normalizeUsername } from "../lib/playerAuth";
import { LEDGER_KIND_LABEL, useBalanceLedgerStore } from "../store/balanceLedgerStore";

export function Admin() {
  const [authed, setAuthed] = useState(() => hasAdminSession());

  if (!authed) {
    return <AdminLogin onOk={() => setAuthed(true)} />;
  }

  return <AdminDesk onLogout={() => setAuthed(false)} />;
}

function AdminLogin({ onOk }: { onOk: () => void }) {
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ok = await verifyAdminLogin(username, key);
      if (!ok) {
        setError("Unknown warden or key.");
        sound.lose();
        return;
      }
      persistAdminSession();
      sound.click();
      onOk();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 place-items-center overflow-y-auto bg-[#09090f] px-4 py-10">
      <form onSubmit={(e) => void submit(e)} className="surface w-full max-w-md p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg border-2 border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Prism Vault</p>
            <h1 className="pixel-label text-2xl font-extrabold uppercase text-white">Warden lock</h1>
          </div>
        </div>
        <p className="mb-5 text-xs leading-relaxed text-slate-400">
          Local demo gate. Credentials are hashed in the client bundle — this is not production auth.
        </p>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Username</label>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
        />
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Key</label>
        <input
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mb-4 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
        />
        {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={busy || !username || !key} className="btn-primary w-full py-2.5 text-sm disabled:opacity-40">
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

function AdminDesk({ onLogout }: { onLogout: () => void }) {
  const [selected, setSelected] = useState<string>(LOCAL_PLAYER);
  const [filter, setFilter] = useState("");
  const [lookup, setLookup] = useState("");
  const [amount, setAmount] = useState(1000);
  const [rankTarget, setRankTarget] = useState("");
  const [confirmView, setConfirmView] = useState(false);
  const [deskTab, setDeskTab] = useState<"players" | "support" | "vip" | "cases">("players");
  const [gameFilter, setGameFilter] = useState<ActivityGame | "all">("all");
  const [chatWord, setChatWord] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [wardenReply, setWardenReply] = useState("");
  const navigate = useNavigate();
  const enterView = useAdminViewStore((s) => s.enter);
  const exitView = useAdminViewStore((s) => s.exit);
  const push = useToastStore((s) => s.push);

  const banned = useModerationStore((s) => s.banned);
  const muted = useModerationStore((s) => s.muted);
  const locked = useModerationStore((s) => s.locked);
  const log = useModerationStore((s) => s.log);
  const ban = useModerationStore((s) => s.ban);
  const unban = useModerationStore((s) => s.unban);
  const mute = useModerationStore((s) => s.mute);
  const unmute = useModerationStore((s) => s.unmute);
  const lock = useModerationStore((s) => s.lock);
  const unlock = useModerationStore((s) => s.unlock);
  const topUpShards = useModerationStore((s) => s.topUpShards);
  const grantFunCoins = useModerationStore((s) => s.grantFunCoins);
  const grantPendingRakeback = useModerationStore((s) => s.grantPendingRakeback);
  const resetPlayer = useModerationStore((s) => s.resetPlayer);
  const snapshot = useModerationStore((s) => s.snapshot);
  const plays = useActivityStore((s) => s.plays);
  const playsFor = useActivityStore((s) => s.playsFor);
  const totalsFor = useActivityStore((s) => s.totalsFor);
  const chatMessages = useChatStore((s) => s.messages);
  const chatHistory = useChatStore((s) => s.history);
  const historyFor = useChatStore((s) => s.historyFor);
  const ledgerEntries = useBalanceLedgerStore((s) => s.entries);
  const entriesFor = useBalanceLedgerStore((s) => s.entriesFor);
  const tickets = useSupportStore((s) => s.tickets);
  const replyTicket = useSupportStore((s) => s.reply);
  const closeTicket = useSupportStore((s) => s.closeTicket);
  const reopenTicket = useSupportStore((s) => s.reopenTicket);
  const accounts = useAuthStore((s) => s.accounts);
  const session = useAuthStore((s) => s.session);
  const grantXp = useLoyaltyStore((s) => s.grantXp);
  const setRank = useLoyaltyStore((s) => s.setRank);
  const xpByUser = useLoyaltyStore((s) => s.xpByUser);
  const loyaltyConfig = useLoyaltyStore((s) => s.config);
  const setRole = useIdentityStore((s) => s.setRole);
  const currentRole = useIdentityStore((s) => s.roleFor(selected));

  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const pendingRakeback = useEconomyStore((s) => s.pendingRakeback);
  const pendingDailyRakeback = useEconomyStore((s) => s.pendingDailyRakeback);
  const totalWagered = useEconomyStore((s) => s.totalWagered);
  const totalWon = useEconomyStore((s) => s.totalWon);
  const roundsPlayed = useEconomyStore((s) => s.roundsPlayed);

  const q = filter.trim().toLowerCase();
  const names = useMemo(() => {
    const extra = new Set<string>(MODERATION_PLAYERS);
    extra.add(lookup.trim());
    for (const p of plays) extra.add(p.name);
    for (const m of chatMessages) extra.add(m.name);
    for (const m of chatHistory ?? []) extra.add(m.name);
    for (const a of accounts) extra.add(a.username);
    const list = [...extra].filter(Boolean);
    return list.filter((n) => !q || n.toLowerCase().includes(q));
  }, [q, plays, chatMessages, chatHistory, lookup, accounts]);

  const snap = snapshot(selected);
  const youBanned = banned.includes(LOCAL_PLAYER);
  const youLocked = locked.includes(LOCAL_PLAYER);
  const activityTotals = totalsFor(selected);
  const ecoWagered = selected === LOCAL_PLAYER ? totalWagered : activityTotals.wagered || snap.wagered;
  const ecoWon = selected === LOCAL_PLAYER ? totalWon : activityTotals.won;
  const profit = ecoWon - ecoWagered;
  const recentPlays = playsFor(selected, gameFilter);
  const word = chatWord.trim().toLowerCase();
  const playerChat = historyFor(selected).filter((m) => {
    if (!word) return true;
    return m.text.toLowerCase().includes(word);
  });
  const balanceRows = entriesFor(selected);
  void ledgerEntries;
  const loginName =
    selected === LOCAL_PLAYER
      ? session
      : accounts.some((a) => a.username.toLowerCase() === selected.toLowerCase())
        ? selected
        : null;
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const activeTicket = tickets.find((t) => t.id === ticketId) ?? null;
  const xpUser = selected === LOCAL_PLAYER ? LOCAL_XP_USER : selected;
  const lifetimeXp = xpByUser[xpUser] ?? 0;
  const vip = resolveVip(lifetimeXp, loyaltyConfig.tiers);

  function lookUpTyped() {
    const name = lookup.trim();
    if (!name) return;
    setSelected(name);
    setFilter(name);
    sound.click();
  }

  function act(label: string, fn: () => void) {
    fn();
    sound.click();
    push(label, "success");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#09090f]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[#3a5c5c]/60 bg-[#101818] px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-300" />
          <h1 className="pixel-label text-xl font-extrabold uppercase text-white">Vault warden</h1>
          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
            Demo tools
          </span>
          <div className="ml-2 flex rounded-md border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setDeskTab("players")}
              className={clsx(
                "rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                deskTab === "players" ? "bg-cyan-400/20 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              Players
            </button>
            <button
              type="button"
              onClick={() => setDeskTab("support")}
              className={clsx(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                deskTab === "support" ? "bg-cyan-400/20 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              <Headphones className="h-3 w-3" /> Support
              {openTickets > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-bg-950">{openTickets}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeskTab("cases")}
              className={clsx(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                deskTab === "cases" ? "bg-cyan-400/20 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              <Package className="h-3 w-3" /> Cases
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.click();
              setConfirmView(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-400/25"
          >
            <Eye className="h-3.5 w-3.5" /> Admin view
          </button>
          <button
            type="button"
            onClick={() => {
              exitView();
              clearAdminSession();
              sound.click();
              onLogout();
            }}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5" /> Lock
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className={clsx("mx-auto grid max-w-6xl gap-4", deskTab === "players" && "lg:grid-cols-[260px_1fr]")}>
          {deskTab === "players" && (
          <aside className="surface h-fit p-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter players…"
              className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
            />
            <form
              className="mb-2 flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                lookUpTyped();
              }}
            >
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="Look up any name…"
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
              />
              <button type="submit" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan-400/40 text-cyan-200" title="Look up">
                <Search className="h-4 w-4" />
              </button>
            </form>
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {names.map((name) => {
                const isYou = name === LOCAL_PLAYER;
                const isBan = banned.includes(name);
                const isMute = muted.includes(name);
                const isLock = locked.includes(name);
                const hasLogin = accounts.some((a) => a.username.toLowerCase() === name.toLowerCase());
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setSelected(name)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm",
                        selected === name ? "bg-cyan-400/15 text-white" : "text-slate-300 hover:bg-white/5",
                      )}
                    >
                      <span className="font-semibold">{isYou ? "You (local)" : name}</span>
                      <span className="flex gap-1 text-[10px] font-bold uppercase">
                        {hasLogin && <span className="text-emerald-300">login</span>}
                        {isBan && <span className="text-rose-300">ban</span>}
                        {isMute && <span className="text-amber-300">mute</span>}
                        {isLock && <span className="text-orange-300">lock</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          )}

          <div className="space-y-4">
            {deskTab === "vip" ? (
              <VipDesk />
            ) : deskTab === "cases" ? (
              <CasesDesk />
            ) : deskTab === "support" ? (
              <SupportDesk
                tickets={tickets}
                active={activeTicket}
                reply={wardenReply}
                setReply={setWardenReply}
                onSelect={setTicketId}
                onSend={() => {
                  if (!activeTicket || !wardenReply.trim()) return;
                  replyTicket(activeTicket.id, wardenReply, "warden");
                  setWardenReply("");
                  sound.click();
                  push("Reply sent.", "success");
                }}
                onClose={() => {
                  if (!activeTicket) return;
                  closeTicket(activeTicket.id);
                  sound.click();
                  push("Ticket closed.", "info");
                }}
                onReopen={() => {
                  if (!activeTicket) return;
                  reopenTicket(activeTicket.id);
                  sound.click();
                  push("Ticket reopened.", "success");
                }}
              />
            ) : (
              <>
            {youBanned && (
              <p className="rounded-md border-2 border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                Local player is banned — stakes and chat are blocked until you unban You.
              </p>
            )}
            {youLocked && (
              <p className="rounded-md border-2 border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Local player is locked — they cannot wager, tip, claim, or spend until you unlock You.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Your World Locks" value={formatCredits(balance)} />
              <Stat label="Shards" value={formatFunCoins(funCoins)} />
              <Stat label="Pending Instant" value={formatRakeback(pendingRakeback ?? 0)} />
              <Stat label="Pending Daily" value={formatRakeback(pendingDailyRakeback ?? 0)} />
              <Stat label="Wagered / rounds" value={`${formatCredits(totalWagered)} · ${roundsPlayed}`} />
            </div>
            <p className="text-xs text-slate-500">
              Local economy: won {formatCash(totalWon)} across {roundsPlayed} recorded rounds. Bots have no live
              wallet unless you top them up here.
            </p>

            <div className="surface p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-white">{selected === LOCAL_PLAYER ? "You (local)" : selected}</h2>
                <div className="flex gap-1.5">
                  {snap.banned ? (
                    <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-200">Banned</span>
                  ) : null}
                  {snap.muted ? (
                    <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">Muted</span>
                  ) : null}
                  {snap.locked ? (
                    <span className="rounded-md bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-200">Locked</span>
                  ) : null}
                </div>
              </div>
              <label className="mb-4 block max-w-xs text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Visual role
                <select
                  value={currentRole ?? ""}
                  onChange={(e) => {
                    const v = e.target.value as VisualRole | "";
                    setRole(selected, v || null);
                    sound.click();
                    push(v ? `${selected}: ${VISUAL_ROLE_LIST.find((r) => r.id === v)?.label} badge` : `${selected}: role cleared`, "success");
                  }}
                  className="mt-1 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-cyan-400/40"
                >
                  <option value="">None (visual only)</option>
                  {VISUAL_ROLE_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mb-4 text-[11px] text-slate-500">
                Badges show in chat, battles, and jackpot. Owner wagers are excluded from leaderboards, rakeback, rank XP, shards-from-wager, and Vault Race.
                {currentRole ? (
                  <>
                    {" "}
                    Current: <RoleBadge role={currentRole} />
                  </>
                ) : null}
              </p>
              <div className="mb-4 grid gap-2 sm:grid-cols-4">
                <Mini label="World Locks" value={formatCredits(snap.shards)} />
                <Mini label="Shards" value={formatFunCoins(snap.funCoins)} />
                <Mini label="Wagered" value={formatCredits(ecoWagered)} />
                <Mini
                  label="Profit / loss"
                  value={`${profit >= 0 ? "+" : ""}${formatCredits(profit)}`}
                />
                <Mini label="Lifetime XP" value={formatXp(lifetimeXp)} />
                <Mini label="VIP" value={vip.current.name} />
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Won {formatCash(ecoWon)} across {selected === LOCAL_PLAYER ? roundsPlayed : activityTotals.rounds} recorded
                rounds. P/L is winnings minus wagered.
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {snap.banned ? (
                  <button type="button" className="rounded-md border-2 border-emerald-400/40 px-3 py-1.5 text-xs font-bold uppercase text-emerald-200" onClick={() => act(`Unbanned ${selected}`, () => unban(selected))}>
                    Unban
                  </button>
                ) : (
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border-2 border-rose-400/40 px-3 py-1.5 text-xs font-bold uppercase text-rose-200" onClick={() => act(`Banned ${selected}`, () => ban(selected))}>
                    <Ban className="h-3.5 w-3.5" /> Ban
                  </button>
                )}
                {snap.muted ? (
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-400/40 px-3 py-1.5 text-xs font-bold uppercase text-emerald-200" onClick={() => act(`Unmuted ${selected}`, () => unmute(selected))}>
                    <Volume2 className="h-3.5 w-3.5" /> Unmute
                  </button>
                ) : (
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border-2 border-amber-400/40 px-3 py-1.5 text-xs font-bold uppercase text-amber-200" onClick={() => act(`Muted ${selected}`, () => mute(selected))}>
                    <VolumeX className="h-3.5 w-3.5" /> Mute
                  </button>
                )}
                {snap.locked ? (
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-400/40 px-3 py-1.5 text-xs font-bold uppercase text-emerald-200" onClick={() => act(`Unlocked ${selected}`, () => unlock(selected))}>
                    <Unlock className="h-3.5 w-3.5" /> Unlock
                  </button>
                ) : (
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border-2 border-orange-400/40 px-3 py-1.5 text-xs font-bold uppercase text-orange-200" onClick={() => act(`Locked ${selected}`, () => lock(selected))}>
                    <Lock className="h-3.5 w-3.5" /> Lock balance
                  </button>
                )}
              </div>

              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Amount</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
                className="mb-3 w-full max-w-xs rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-white outline-none focus:border-cyan-400/40"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary inline-flex gap-1.5 px-3 py-2 text-xs" onClick={() => act(`+${amount} WL → ${selected}`, () => topUpShards(selected, amount))}>
                  <Wallet className="h-3.5 w-3.5" /> Top up WL
                </button>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase text-amber-100" onClick={() => act(`+${amount} Shards → ${selected}`, () => grantFunCoins(selected, amount))}>
                  <Coins className="h-3.5 w-3.5" /> Grant Shards
                </button>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-md border-2 border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold uppercase text-cyan-100" onClick={() => act(`+${amount} pending rakeback → ${selected}`, () => grantPendingRakeback(selected, amount))}>
                  <Gift className="h-3.5 w-3.5" /> Grant rakeback
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-violet-400/40 bg-violet-400/10 px-3 py-2 text-xs font-bold uppercase text-violet-100"
                  onClick={() => act(`+${amount} XP → ${selected}`, () => grantXp(xpUser, amount, "Warden grant"))}
                >
                  <Crown className="h-3.5 w-3.5" /> Grant XP
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/15 px-3 py-2 text-xs font-bold uppercase text-slate-300"
                  onClick={() => {
                    if (!window.confirm(`Reset ${selected}? This clears demo balances for that player.`)) return;
                    act(`Reset ${selected}`, () => resetPlayer(selected));
                  }}
                >
                  Reset player
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Set rank
                  <select
                    value={rankTarget || vip.current.id}
                    onChange={(e) => setRankTarget(e.target.value)}
                    className="mt-1 block min-w-[14rem] rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-cyan-400/40"
                  >
                    {sortedTiers(loyaltyConfig.tiers).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {formatXp(t.minXp)} XP
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-bold uppercase text-rose-100"
                  onClick={() => {
                    const id = rankTarget || vip.current.id;
                    const tier = loyaltyConfig.tiers.find((t) => t.id === id);
                    if (!tier) return;
                    if (
                      !window.confirm(
                        `Set ${selected} to ${tier.name}? Lifetime XP becomes ${formatXp(tier.minXp)} (was ${formatXp(lifetimeXp)}). Rank drops and keys are not granted.`,
                      )
                    ) {
                      return;
                    }
                    act(`${selected} → ${tier.name}`, () => setRank(xpUser, tier.id));
                  }}
                >
                  Apply rank
                </button>
                <p className="w-full text-[11px] text-slate-500">
                  Use this for wager-abuse demotions (Emperor → Silver 1, Unranked, etc.). It replaces lifetime XP; it
                  does not delete rank keys already opened.
                </p>
              </div>
              {selected !== LOCAL_PLAYER && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Bot wallets are recorded in the warden store only — they have no live economy until you credit them.
                </p>
              )}
            </div>

            <AccountLoginCard
              username={loginName}
              onRenamed={(next) => {
                setSelected(next);
                setFilter(next);
              }}
            />

            <div className="surface p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Balance history</p>
              {balanceRows.length === 0 ? (
                <p className="text-sm text-slate-500">No World Lock or Shard movements on record for this player yet.</p>
              ) : (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto text-xs">
                  {balanceRows.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-2 rounded-md bg-black/25 px-2 py-1.5">
                      <span className="min-w-0">
                        <span className="font-semibold text-white">{LEDGER_KIND_LABEL[row.kind]}</span>
                        {row.note ? <span className="ml-1.5 text-slate-500">{row.note}</span> : null}
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{new Date(row.at).toLocaleString()}</span>
                      </span>
                      <span className="shrink-0 text-right font-mono">
                        <span className={clsx("font-bold", row.amount >= 0 ? "text-emerald-300" : "text-rose-300")}>
                          {row.amount >= 0 ? "+" : ""}
                          {formatPlayCash(row.amount, row.currency)}
                        </span>
                        {row.balanceAfter != null ? (
                          <span className="mt-0.5 block text-[10px] text-slate-500">
                            bal {formatPlayCash(row.balanceAfter, row.currency)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="surface p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Recent games</p>
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value as ActivityGame | "all")}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/40"
                >
                  <option value="all">All games</option>
                  {ACTIVITY_GAMES.map((g) => (
                    <option key={g} value={g}>
                      {ACTIVITY_GAME_LABELS[g]}
                    </option>
                  ))}
                </select>
              </div>
              {recentPlays.length === 0 ? (
                <p className="text-sm text-slate-500">No rounds on record for this player{gameFilter !== "all" ? ` in ${ACTIVITY_GAME_LABELS[gameFilter]}` : ""}.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs">
                  {recentPlays.slice(0, 40).map((row) => {
                    const delta = row.won - row.wagered;
                    return (
                      <li key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-black/25 px-2 py-1.5">
                        <span className="min-w-0">
                          <span className="font-semibold text-white">{ACTIVITY_GAME_LABELS[row.game]}</span>
                          <span className="ml-2 font-mono text-slate-500">{new Date(row.at).toLocaleString()}</span>
                        </span>
                        <span className="shrink-0 font-mono">
                          <span className="text-slate-400">{formatCredits(row.wagered)} in</span>
                          <span className={clsx("ml-2 font-bold", delta >= 0 ? "text-emerald-300" : "text-rose-300")}>
                            {delta >= 0 ? "+" : ""}
                            {formatCredits(delta)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="surface p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <MessageSquare className="h-3.5 w-3.5" /> Chat history
                </p>
                <input
                  value={chatWord}
                  onChange={(e) => setChatWord(e.target.value)}
                  placeholder="Filter by word…"
                  className="w-44 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/40"
                />
              </div>
              {playerChat.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {word ? `No messages from ${selected} containing “${chatWord.trim()}”.` : `No chat from ${selected} yet.`}
                </p>
              ) : (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto text-xs text-slate-300">
                  {playerChat
                    .slice()
                    .reverse()
                    .map((m) => (
                      <li key={m.id} className="rounded-md bg-black/25 px-2 py-1.5">
                        <span className="mr-2 font-mono text-slate-500">{new Date(m.at).toLocaleString()}</span>
                        {m.tip ? <span className="mr-1 text-[10px] font-bold uppercase text-emerald-300">tip</span> : null}
                        {m.text}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="surface p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Warden log</p>
              {log.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No actions yet this session.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-xs text-slate-300">
                  {log.map((row) => (
                    <li key={`${row.at}-${row.action}`} className="flex gap-2">
                      <span className="font-mono text-slate-500">{new Date(row.at).toLocaleTimeString()}</span>
                      <span>{row.action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmView && (
        <ReenterGate
          onCancel={() => setConfirmView(false)}
          onOk={() => {
            persistAdminViewUnlock();
            enterView();
            setConfirmView(false);
            navigate("/");
            push("Admin view on — re-enter the key any time you enter it from this desk.", "success");
          }}
        />
      )}
    </div>
  );
}

function SupportDesk({
  tickets,
  active,
  reply,
  setReply,
  onSelect,
  onSend,
  onClose,
  onReopen,
}: {
  tickets: SupportTicket[];
  active: SupportTicket | null;
  reply: string;
  setReply: (v: string) => void;
  onSelect: (id: string) => void;
  onSend: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="surface p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Tickets</p>
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets yet. Players open them from the Support button on the live site.</p>
        ) : (
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {[...tickets]
              .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
              .map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={clsx(
                    "flex w-full flex-col rounded-md px-2.5 py-2 text-left",
                    active?.id === t.id ? "bg-cyan-400/15 text-white" : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <span className="truncate text-sm font-semibold">{t.subject}</span>
                  <span className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
                    <span>{t.from}</span>
                    <span className={t.status === "open" ? "text-emerald-300" : "text-slate-500"}>{t.status}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="surface flex min-h-[360px] flex-col p-5">
        {!active ? (
          <p className="m-auto text-sm text-slate-500">Select a ticket to read and reply.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">{active.subject}</h2>
                <p className="text-xs text-slate-500">
                  {active.from} · {new Date(active.createdAt).toLocaleString()}
                </p>
              </div>
              {active.status === "open" ? (
                <button type="button" onClick={onClose} className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-300">
                  Close ticket
                </button>
              ) : (
                <button type="button" onClick={onReopen} className="rounded-md border border-emerald-400/40 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-200">
                  Reopen
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={clsx(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    m.from === "warden" ? "ml-auto bg-cyan-400/15 text-cyan-50" : "bg-black/30 text-slate-200",
                  )}
                >
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {m.from === "warden" ? "Warden" : active.from} · {new Date(m.at).toLocaleTimeString()}
                  </p>
                  {m.text}
                </div>
              ))}
            </div>
            {active.status === "open" && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSend();
                }}
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as warden…"
                  className="min-w-0 flex-1 rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
                />
                <button type="submit" disabled={!reply.trim()} className="btn-primary px-4 py-2 text-xs disabled:opacity-40">
                  Send
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
    </div>
  );
}

function AccountLoginCard({
  username,
  onRenamed,
}: {
  username: string | null;
  onRenamed: (next: string) => void;
}) {
  const accounts = useAuthStore((s) => s.accounts);
  const renameAccount = useAuthStore((s) => s.renameAccount);
  const setAccountPassword = useAuthStore((s) => s.setAccountPassword);
  const setAccountEmail = useAuthStore((s) => s.setAccountEmail);
  const push = useToastStore((s) => s.push);
  const acc = username
    ? accounts.find((a) => a.username.toLowerCase() === username.toLowerCase())
    : undefined;
  const [nextName, setNextName] = useState(acc?.username ?? "");
  const [nextEmail, setNextEmail] = useState(acc?.email ?? "");
  const [nextPassword, setNextPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const accKey = acc?.username ?? "";
  const [seen, setSeen] = useState(accKey);
  if (accKey !== seen) {
    setSeen(accKey);
    setNextName(acc?.username ?? "");
    setNextEmail(acc?.email ?? "");
    setNextPassword("");
  }

  if (!username || !acc) {
    return (
      <div className="surface p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <KeyRound className="h-3.5 w-3.5" /> Login
        </p>
        <p className="mt-2 text-sm text-slate-500">
          No username/password for this player yet. Registered accounts appear in the list with a login badge.
        </p>
      </div>
    );
  }

  const account = acc;

  function saveUsername() {
    const err = renameAccount(account.username, nextName);
    if (err) {
      push(err, "danger");
      return;
    }
    sound.click();
    const saved = normalizeUsername(nextName);
    onRenamed(saved);
    push(`Username set to ${saved}.`, "success");
  }

  async function savePassword() {
    setBusy(true);
    try {
      const err = await setAccountPassword(account.username, nextPassword);
      if (err) {
        push(err, "danger");
        return;
      }
      setNextPassword("");
      sound.click();
      push("Password updated.", "success");
    } finally {
      setBusy(false);
    }
  }

  function saveEmail() {
    const err = setAccountEmail(account.username, nextEmail);
    if (err) {
      push(err, "danger");
      return;
    }
    sound.click();
    push("Email updated.", "success");
  }

  return (
    <div className="surface p-5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        <KeyRound className="h-3.5 w-3.5" /> Login
      </p>
      <p className="mb-3 text-xs text-slate-500">
        Change this player’s username or password. Password needs 8+ characters, one uppercase letter, and one number.
      </p>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Username</label>
      <div className="mb-3 flex max-w-md gap-2">
        <input
          value={nextName}
          onChange={(e) => setNextName(e.target.value)}
          className="min-w-0 flex-1 rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
        />
        <button
          type="button"
          onClick={saveUsername}
          className="rounded-md border-2 border-cyan-400/40 px-3 py-2 text-xs font-bold uppercase text-cyan-100"
        >
          Save
        </button>
      </div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Email <span className="font-medium normal-case tracking-normal text-slate-600">(optional)</span>
      </label>
      <div className="mb-3 flex max-w-md gap-2">
        <input
          type="email"
          value={nextEmail}
          onChange={(e) => setNextEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
        />
        <button
          type="button"
          onClick={saveEmail}
          className="rounded-md border-2 border-cyan-400/40 px-3 py-2 text-xs font-bold uppercase text-cyan-100"
        >
          Save
        </button>
      </div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">New password</label>
      <div className="flex max-w-md gap-2">
        <input
          type="password"
          value={nextPassword}
          onChange={(e) => setNextPassword(e.target.value)}
          placeholder="Leave blank to keep"
          className="min-w-0 flex-1 rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
        />
        <button
          type="button"
          disabled={busy || !nextPassword}
          onClick={() => void savePassword()}
          className="rounded-md border-2 border-cyan-400/40 px-3 py-2 text-xs font-bold uppercase text-cyan-100 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/30 px-2.5 py-2 ring-1 ring-white/8">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ReenterGate({ onOk, onCancel }: { onOk: () => void; onCancel: () => void }) {
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ok = await verifyAdminLogin(username, key);
      if (!ok) {
        setError("Key did not match. Admin view stays locked.");
        sound.lose();
        return;
      }
      sound.click();
      onOk();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={(e) => void submit(e)} className="surface w-full max-w-sm p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">Security check</p>
        <h2 className="mt-1 text-lg font-extrabold text-white">Re-enter warden key</h2>
        <p className="mt-2 text-xs text-slate-400">
          Admin view opens the live site with moderation tools. Confirm username and key before entering.
        </p>
        <label className="mt-4 mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Username</label>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-400/40"
        />
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Key</label>
        <input
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mb-3 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-400/40"
        />
        {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-md border-2 border-white/10 py-2 text-xs font-bold uppercase text-slate-300">
            Cancel
          </button>
          <button type="submit" disabled={busy || !username || !key} className="btn-primary flex-1 py-2 text-xs disabled:opacity-40">
            {busy ? "Checking…" : "Enter admin view"}
          </button>
        </div>
      </form>
    </div>
  );
}
