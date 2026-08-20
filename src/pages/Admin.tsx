import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Coins, Eye, Gift, LogOut, Shield, Volume2, VolumeX, Wallet } from "lucide-react";
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
import { formatCredits, formatFunCoins, formatRakeback } from "../lib/format";
import { sound } from "../lib/sound";
import { useToastStore } from "../store/toastStore";

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
  const [amount, setAmount] = useState(1000);
  const [confirmView, setConfirmView] = useState(false);
  const navigate = useNavigate();
  const enterView = useAdminViewStore((s) => s.enter);
  const exitView = useAdminViewStore((s) => s.exit);
  const push = useToastStore((s) => s.push);

  const banned = useModerationStore((s) => s.banned);
  const muted = useModerationStore((s) => s.muted);
  const log = useModerationStore((s) => s.log);
  const ban = useModerationStore((s) => s.ban);
  const unban = useModerationStore((s) => s.unban);
  const mute = useModerationStore((s) => s.mute);
  const unmute = useModerationStore((s) => s.unmute);
  const topUpShards = useModerationStore((s) => s.topUpShards);
  const grantFunCoins = useModerationStore((s) => s.grantFunCoins);
  const grantPendingRakeback = useModerationStore((s) => s.grantPendingRakeback);
  const resetPlayer = useModerationStore((s) => s.resetPlayer);
  const snapshot = useModerationStore((s) => s.snapshot);

  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const pendingRakeback = useEconomyStore((s) => s.pendingRakeback);
  const totalWagered = useEconomyStore((s) => s.totalWagered);
  const totalWon = useEconomyStore((s) => s.totalWon);
  const roundsPlayed = useEconomyStore((s) => s.roundsPlayed);

  const q = filter.trim().toLowerCase();
  const names = useMemo(
    () => MODERATION_PLAYERS.filter((n) => !q || n.toLowerCase().includes(q)),
    [q],
  );

  const snap = snapshot(selected);
  const youBanned = banned.includes(LOCAL_PLAYER);

  function act(label: string, fn: () => void) {
    fn();
    sound.click();
    push(label, "success");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#09090f]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[#3d5a3a]/60 bg-[#101810] px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-300" />
          <h1 className="pixel-label text-xl font-extrabold uppercase text-white">Vault warden</h1>
          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
            Demo tools
          </span>
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
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="surface h-fit p-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter players…"
              className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
            />
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {names.map((name) => {
                const isYou = name === LOCAL_PLAYER;
                const isBan = banned.includes(name);
                const isMute = muted.includes(name);
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
                        {isBan && <span className="text-rose-300">ban</span>}
                        {isMute && <span className="text-amber-300">mute</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="space-y-4">
            {youBanned && (
              <p className="rounded-md border-2 border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                Local player is banned — stakes and chat are blocked until you unban You.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Your Shards" value={formatCredits(balance)} />
              <Stat label="Fun Coins" value={formatFunCoins(funCoins)} />
              <Stat label="Pending rakeback" value={formatRakeback(pendingRakeback ?? 0)} />
              <Stat label="Wagered / rounds" value={`${formatCredits(totalWagered)} · ${roundsPlayed}`} />
            </div>
            <p className="text-xs text-slate-500">
              Local economy: won {formatCredits(totalWon)} SH across {roundsPlayed} recorded rounds. Bots have no live
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
                </div>
              </div>
              <div className="mb-4 grid gap-2 sm:grid-cols-4">
                <Mini label="Shards" value={formatCredits(snap.shards)} />
                <Mini label="Fun Coins" value={formatFunCoins(snap.funCoins)} />
                <Mini label="Pending RB" value={formatRakeback(snap.pendingRakeback)} />
                <Mini label="Wagered" value={formatCredits(snap.wagered)} />
              </div>

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
                <button type="button" className="btn-primary inline-flex gap-1.5 px-3 py-2 text-xs" onClick={() => act(`+${amount} SH → ${selected}`, () => topUpShards(selected, amount))}>
                  <Wallet className="h-3.5 w-3.5" /> Top up SH
                </button>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase text-amber-100" onClick={() => act(`+${amount} Fun Coins → ${selected}`, () => grantFunCoins(selected, amount))}>
                  <Coins className="h-3.5 w-3.5" /> Grant Fun Coins
                </button>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-md border-2 border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold uppercase text-cyan-100" onClick={() => act(`+${amount} pending rakeback → ${selected}`, () => grantPendingRakeback(selected, amount))}>
                  <Gift className="h-3.5 w-3.5" /> Grant rakeback
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
              {selected !== LOCAL_PLAYER && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Bot wallets are recorded in the warden store only — they have no live economy until you credit them.
                </p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
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
