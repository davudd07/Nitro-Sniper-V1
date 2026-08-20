import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Swords,
  GripVertical,
  ArrowLeft,
  Banknote,
  Lock,
  Handshake,
  Zap,
  Shuffle,
  Coins,
  Flag,
  Sparkles,
  Bot,
  User,
  Info,
  Users,
  ArrowDownUp,
  Gem,
} from "lucide-react";
import { clsx } from "clsx";
import { sound } from "../lib/sound";
import { Switch } from "../components/ui/Switch";
import { AddCasesModal } from "../components/battles/AddCasesModal";
import { CaseThumb } from "../components/cases/CaseThumb";
import { CasePreviewModal } from "../components/cases/CasePreviewModal";
import { BATTLE_MODES, PLAYER_COLORS, totalPlayers } from "../data/battleModes";
import { getCase } from "../data/cases";
import type { BattleCaseEntry } from "../store/battleStore";
import { useBattleStore } from "../store/battleStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { formatCredits } from "../lib/format";
import { creatorCreateCost, MAX_BORROW_PCT, pctLabel } from "../lib/battleFinance";

function flatten(entries: BattleCaseEntry[]): string[] {
  return entries.flatMap((e) => Array.from({ length: e.count }, () => e.caseId));
}

function groupRounds(ids: string[]): BattleCaseEntry[] {
  const out: BattleCaseEntry[] = [];
  for (const id of ids) {
    const last = out[out.length - 1];
    if (last && last.caseId === id) last.count += 1;
    else out.push({ caseId: id, count: 1 });
  }
  return out;
}

export function CreateBattle() {
  const navigate = useNavigate();
  const [modeId, setModeId] = useState("1v1");
  const [shared, setShared] = useState(false);
  const [crazy, setCrazy] = useState(false);
  const [jackpot, setJackpot] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [goldSpin, setGoldSpin] = useState(true);
  const [rounds, setRounds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [fundedOn, setFundedOn] = useState(false);
  const [fundedPct, setFundedPct] = useState(0.5);
  const [borrowOn, setBorrowOn] = useState(false);
  const [borrowPct, setBorrowPct] = useState(0.5);
  const [isPrivate, setIsPrivate] = useState(false);
  const [fastSpin, setFastSpin] = useState(false);
  const [callAllBots, setCallAllBots] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const createBattle = useBattleStore((s) => s.createBattle);
  const setJoinIntent = useBattleStore((s) => s.setJoinIntent);
  const spend = useEconomyStore((s) => s.spend);
  const push = useToastStore((s) => s.push);

  const mode = BATTLE_MODES.find((m) => m.id === modeId)!;
  const players = totalPlayers(mode);
  const cases = useMemo(() => groupRounds(rounds), [rounds]);
  const costPerPlayer = useMemo(
    () => rounds.reduce((s, id) => s + (getCase(id)?.price ?? 0), 0),
    [rounds],
  );
  const effectiveFund = fundedOn ? fundedPct : 0;
  const effectiveBorrow = fundedOn || !borrowOn ? 0 : borrowPct;
  const youPay = creatorCreateCost(costPerPlayer, players, effectiveFund, effectiveBorrow);
  const joinerPay = Math.round(costPerPlayer * (1 - effectiveFund));

  function setGameMode(next: "classic" | "shared") {
    sound.click();
    const on = next === "shared";
    setShared(on);
    if (on) {
      setJackpot(false);
      setCrazy(false);
      setTerminal(false);
    }
  }

  function sortRounds() {
    sound.click();
    const nextDir = !sortAsc;
    setSortAsc(nextDir);
    setRounds((prev) =>
      [...prev].sort((a, b) => {
        const pa = getCase(a)?.price ?? 0;
        const pb = getCase(b)?.price ?? 0;
        return nextDir ? pa - pb : pb - pa;
      }),
    );
  }

  function shuffleRounds() {
    sound.click();
    setRounds((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  function onDrop(to: number) {
    if (dragFrom == null || dragFrom === to) {
      setDragFrom(null);
      return;
    }
    setRounds((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragFrom, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragFrom(null);
  }

  function handleCreate() {
    if (rounds.length === 0) {
      push("Add at least one case to the battle.", "warning");
      return;
    }
    if (!spend(youPay)) {
      push(`You need ${formatCredits(youPay)} SH to create this battle.`, "danger");
      return;
    }
    const id = createBattle({
      modeId,
      crazy: shared ? false : crazy,
      jackpot: shared ? false : jackpot,
      goldSpin,
      terminal: shared ? false : terminal,
      shared,
      fastSpin,
      cases,
      costPerPlayer,
      fundedPct: effectiveFund,
      isPrivate,
      source: "you",
      prefillBots: callAllBots ? players - 1 : 0,
    });
    setJoinIntent(id, { borrowPct: effectiveBorrow });
    push(
      isPrivate
        ? "Private battle created. Share the link — it won’t show in the lobby."
        : "Battle created! Fill the remaining slots to start.",
      "success",
    );
    navigate(`/battles/${id}`);
  }

  return (
    <>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link
            to="/battles"
            onClick={() => sound.click()}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Create Battle</h1>
        </div>

        <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Game mode</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeCard
                active={!shared}
                icon={Swords}
                title="Classic"
                blurb="Pull the most to win."
                onClick={() => setGameMode("classic")}
              />
              <ModeCard
                active={shared}
                icon={Users}
                title="Shared"
                blurb="Split the winnings equally."
                onClick={() => setGameMode("shared")}
              />
            </div>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Add cases · {rounds.length} round{rounds.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={sortRounds}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-200 hover:bg-white/5"
                >
                  <ArrowDownUp className="h-3.5 w-3.5" /> Sort
                </button>
                <button
                  type="button"
                  onClick={shuffleRounds}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-200 hover:bg-white/5"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Shuffle
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {rounds.map((id, i) => {
                const c = getCase(id);
                if (!c) return null;
                return (
                  <div
                    key={`${id}-${i}`}
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => onDrop(i)}
                    onDragEnd={() => setDragFrom(null)}
                    className={clsx(
                      "group overflow-hidden rounded-2xl border bg-bg-900/70 transition-colors",
                      dragFrom === i ? "border-fuchsia-400/60 opacity-60" : "border-white/10",
                    )}
                  >
                    <div className="flex items-center justify-between px-2 pt-1.5">
                      <span className="cursor-grab text-slate-500 active:cursor-grabbing" title="Drag to reorder">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{formatCredits(c.price)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.click();
                        setPreviewId(c.id);
                      }}
                      className="w-full text-left"
                      title="Inspect case"
                    >
                      <CaseThumb c={c} className="h-24" />
                    </button>
                    <div className="flex items-center justify-between gap-1 p-2">
                      <p className="min-w-0 truncate text-xs font-medium text-white">{c.name}</p>
                      <button
                        type="button"
                        title="Remove round"
                        onClick={() => {
                          sound.click();
                          setRounds((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="rounded-md px-1.5 text-xs text-slate-500 hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  setModalOpen(true);
                }}
                className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/5 hover:text-white"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em]">Add case</span>
              </button>
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4">
          <button
            type="button"
            onClick={() => {
              sound.click();
              handleCreate();
            }}
            className="btn-primary w-full gap-2 py-3"
          >
            <span className="text-[13px] font-extrabold uppercase tracking-[0.12em]">Create Battle</span>
            <span className="inline-flex items-center gap-1 font-mono text-sm">
              <Gem className="h-4 w-4" />
              {formatCredits(youPay)}
            </span>
          </button>

          <div className="surface p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Add players</p>
            <label className="mb-3 block">
              <span className="sr-only">Battle format</span>
              <select
                value={modeId}
                onChange={(e) => {
                  sound.click();
                  setModeId(e.target.value);
                }}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-fuchsia-400/40"
              >
                {BATTLE_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: players }, (_, i) => {
                const filled = i === 0 || callAllBots;
                return (
                  <div key={i} className="flex w-14 flex-col items-center gap-1">
                    <div
                      className={clsx(
                        "grid h-11 w-11 place-items-center rounded-full text-xs font-bold",
                        filled ? "text-bg-950" : "border border-dashed border-white/20 text-slate-600",
                      )}
                      style={filled ? { background: PLAYER_COLORS[i % PLAYER_COLORS.length] } : undefined}
                    >
                      {i === 0 ? <User className="h-4 w-4" /> : filled ? <Bot className="h-4 w-4" /> : null}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {i === 0 ? "You" : callAllBots ? "Bot" : "Empty"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
              <span className="text-sm font-medium text-slate-200">Call all bots</span>
              <Switch checked={callAllBots} onChange={setCallAllBots} color="#22d3ee" />
            </div>
          </div>

          <div className="surface p-4">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Modifiers</p>
            <SideToggle
              icon={Coins}
              label="Jackpot mode"
              hint="Ticket-weighted spin decides the winner"
              color="#facc15"
              checked={jackpot}
              disabled={shared}
              onChange={(v) => {
                setJackpot(v);
                if (v) setShared(false);
              }}
            />
            <SideToggle
              icon={Shuffle}
              label="Crazy mode"
              hint="Lowest total wins instead of highest"
              color="#f97316"
              checked={crazy}
              disabled={shared}
              onChange={setCrazy}
            />
            <SideToggle
              icon={Flag}
              label="Terminal mode"
              hint="Only the last case decides the winner"
              color="#f472b6"
              checked={terminal}
              disabled={shared}
              onChange={setTerminal}
            />
            <SideToggle
              icon={Sparkles}
              label="Gold spin"
              hint="Rare pulls trigger a bonus gold reel"
              color="#fbbf24"
              checked={goldSpin}
              onChange={setGoldSpin}
            />
          </div>

          <div className="surface p-4">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">More</p>
            <SideToggle
              icon={Banknote}
              label="Sponsor battle"
              hint="Fund a percentage of every other player's seat. Joiners cannot borrow."
              color="#34d399"
              checked={fundedOn}
              onChange={(v) => {
                setFundedOn(v);
                if (v) setBorrowOn(false);
              }}
            >
              {fundedOn && (
                <div className="mt-2">
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={Math.round(fundedPct * 100)}
                    onChange={(e) => setFundedPct(Number(e.target.value) / 100)}
                    className="w-full accent-emerald-400"
                  />
                  <p className="text-[11px] text-emerald-200">
                    {pctLabel(fundedPct)} funded · joiners pay {formatCredits(joinerPay)} SH
                  </p>
                </div>
              )}
            </SideToggle>
            <SideToggle
              icon={Handshake}
              label="Borrow"
              hint={`Borrow up to ${pctLabel(MAX_BORROW_PCT)} of your own seat. You keep the unborrowed share of winnings. Disabled when the battle is sponsored.`}
              color="#38bdf8"
              checked={borrowOn}
              disabled={fundedOn}
              onChange={(v) => {
                setBorrowOn(v);
                if (v) setFundedOn(false);
              }}
            >
              {borrowOn && !fundedOn && (
                <div className="mt-2">
                  <input
                    type="range"
                    min={5}
                    max={Math.round(MAX_BORROW_PCT * 100)}
                    step={5}
                    value={Math.round(borrowPct * 100)}
                    onChange={(e) => setBorrowPct(Number(e.target.value) / 100)}
                    className="w-full accent-sky-400"
                  />
                  <p className="text-[11px] text-sky-200">
                    Borrow {pctLabel(borrowPct)} · you pay {formatCredits(Math.round(costPerPlayer * (1 - borrowPct)))}{" "}
                    SH · keep {pctLabel(1 - borrowPct)} of winnings
                  </p>
                </div>
              )}
            </SideToggle>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <WideToggle
                icon={Lock}
                label="Private"
                checked={isPrivate}
                onChange={setIsPrivate}
                color="#e879f9"
              />
              <WideToggle icon={Zap} label="Fast spin" checked={fastSpin} onChange={setFastSpin} color="#22d3ee" />
            </div>
          </div>

          <p className="px-1 text-center text-[11px] text-slate-500">
            Seat {formatCredits(costPerPlayer)} SH
            {effectiveBorrow > 0 ? ` · borrow ${pctLabel(effectiveBorrow)}` : ""}
            {effectiveFund > 0 ? ` · you sponsor ${pctLabel(effectiveFund)}` : ""}
            . Your total {formatCredits(youPay)} SH.
          </p>
        </aside>
      </div>

      <AddCasesModal
        key={modalOpen ? "add-cases-open" : "add-cases-closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entries={cases}
        onChange={(next) => setRounds(flatten(next))}
      />
      <CasePreviewModal caseId={previewId} onClose={() => setPreviewId(null)} />
    </>
  );
}

function ModeCard({
  active,
  icon: Icon,
  title,
  blurb,
  onClick,
}: {
  active: boolean;
  icon: typeof Swords;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-fuchsia-400/50 bg-fuchsia-500/10 shadow-[0_0_22px_rgba(217,70,239,0.12)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5",
      )}
    >
      <Icon className={clsx("mb-3 h-7 w-7", active ? "text-fuchsia-300" : "text-slate-400")} />
      <p className="text-sm font-bold uppercase tracking-wide text-white">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{blurb}</p>
    </button>
  );
}

function SideToggle({
  icon: Icon,
  label,
  hint,
  color,
  checked,
  onChange,
  disabled = false,
  children,
}: {
  icon: typeof Coins;
  label: string;
  hint: string;
  color: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("border-b border-white/6 py-2.5 last:border-0", disabled && "opacity-40")}>
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: checked && !disabled ? color : "#64748b" }} />
        <span className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-white">{label}</span>
        <span title={hint} className="text-slate-500">
          <Info className="h-3.5 w-3.5" />
        </span>
        <Switch checked={checked} onChange={onChange} disabled={disabled} color={color} />
      </div>
      {children}
    </div>
  );
}

function WideToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  color,
}: {
  icon: typeof Lock;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sound.click();
        onChange(!checked);
      }}
      className={clsx(
        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left",
        checked ? "border-white/20 bg-white/[0.08]" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
        <Icon className="h-3.5 w-3.5" style={{ color: checked ? color : "#64748b" }} />
        {label}
      </span>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full"
        style={{ backgroundColor: checked ? color : "rgba(255,255,255,0.12)" }}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
