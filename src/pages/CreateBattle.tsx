import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Swords, GripVertical, ArrowDownNarrowWide, ArrowUpNarrowWide, Banknote, Lock } from "lucide-react";
import { sound } from "../lib/sound";
import { ModeSelector, ToggleRow } from "../components/battles/ModeSelector";
import { AddCasesModal } from "../components/battles/AddCasesModal";
import { CaseThumb } from "../components/cases/CaseThumb";
import { CasePreviewModal } from "../components/cases/CasePreviewModal";
import { BATTLE_MODES, totalPlayers } from "../data/battleModes";
import { CASES, getCase } from "../data/cases";
import type { BattleCaseEntry } from "../store/battleStore";
import { useBattleStore } from "../store/battleStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { formatCredits } from "../lib/format";
import { creatorCost, pctLabel } from "../lib/battleFinance";

export function CreateBattle() {
  const navigate = useNavigate();
  const [modeId, setModeId] = useState("2v2");
  const [crazy, setCrazy] = useState(false);
  const [jackpot, setJackpot] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [goldSpin, setGoldSpin] = useState(true);
  const [cases, setCases] = useState<BattleCaseEntry[]>([{ caseId: CASES[0].id, count: 3 }]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [fundedPct, setFundedPct] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);

  const createBattle = useBattleStore((s) => s.createBattle);
  const setJoinIntent = useBattleStore((s) => s.setJoinIntent);
  const spend = useEconomyStore((s) => s.spend);
  const push = useToastStore((s) => s.push);

  const mode = BATTLE_MODES.find((m) => m.id === modeId)!;
  const players = totalPlayers(mode);
  const costPerPlayer = useMemo(
    () => cases.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0),
    [cases],
  );
  const totalCost = costPerPlayer * players;
  const youPay = creatorCost(costPerPlayer, players, fundedPct);
  const joinerPay = Math.round(costPerPlayer * (1 - fundedPct));
  const fundCover = youPay - costPerPlayer;
  const totalCaseCount = cases.reduce((s, e) => s + e.count, 0);

  function sortByPrice(dir: "asc" | "desc") {
    sound.click();
    setCases((prev) =>
      [...prev].sort((a, b) => {
        const pa = getCase(a.caseId)?.price ?? 0;
        const pb = getCase(b.caseId)?.price ?? 0;
        return dir === "asc" ? pa - pb : pb - pa;
      }),
    );
  }

  function onDrop(to: number) {
    if (dragFrom == null || dragFrom === to) {
      setDragFrom(null);
      return;
    }
    setCases((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragFrom, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragFrom(null);
  }

  function handleCreate() {
    if (totalCaseCount === 0) {
      push("Add at least one case to the battle.", "warning");
      return;
    }
    if (!spend(youPay)) {
      push(`You need ${formatCredits(youPay)} SH to create this battle.`, "danger");
      return;
    }
    const id = createBattle({
      modeId,
      crazy,
      jackpot,
      goldSpin,
      terminal,
      cases,
      costPerPlayer,
      fundedPct,
      isPrivate,
      source: "you",
      prefillBots: 0,
    });
    setJoinIntent(id, { borrowPct: 0 });
    push(
      isPrivate
        ? "Private battle created. Share the link — it won’t show in the lobby."
        : "Battle created! Fill the remaining slots to start.",
      "success",
    );
    navigate(`/battles/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-6 w-6 text-amber-300" />
        <h1 className="text-2xl font-semibold tracking-tight text-white">Create Case Battle</h1>
      </div>

      <div className="surface space-y-6 p-5">
        <ModeSelector modeId={modeId} onChange={setModeId} />
        <ToggleRow
          crazy={crazy}
          jackpot={jackpot}
          goldSpin={goldSpin}
          terminal={terminal}
          onCrazy={setCrazy}
          onJackpot={setJackpot}
          onGoldSpin={setGoldSpin}
          onTerminal={setTerminal}
        />

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cases ({totalCaseCount}/50)
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                title="Low to high — cheapest case first"
                onClick={() => sortByPrice("asc")}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                <ArrowDownNarrowWide className="h-3.5 w-3.5" />
                Low→High
              </button>
              <button
                type="button"
                title="High to low — most expensive case first"
                onClick={() => sortByPrice("desc")}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                <ArrowUpNarrowWide className="h-3.5 w-3.5" />
                High→Low
              </button>
              <button
                onClick={() => {
                  sound.click();
                  setModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/5 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" /> Add Cases
              </button>
            </div>
          </div>
          {cases.length === 0 ? (
            <p className="surface p-6 text-center text-sm text-slate-500">No cases added yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cases.map((e, i) => {
                const c = getCase(e.caseId);
                if (!c) return null;
                return (
                  <div
                    key={e.caseId}
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => onDrop(i)}
                    onDragEnd={() => setDragFrom(null)}
                    className={`overflow-hidden rounded-xl border bg-bg-900/60 ${
                      dragFrom === i ? "border-fuchsia-400/60 opacity-60" : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between px-1.5 pt-1">
                      <span className="cursor-grab touch-none text-slate-500 active:cursor-grabbing" title="Drag to reorder">
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
                      title="Preview case contents"
                    >
                      <CaseThumb c={c} className="h-16" />
                      <div className="p-2 text-center">
                        <p className="truncate text-xs font-medium text-white">{c.name}</p>
                        <p className="text-[11px] text-slate-500">x{e.count}</p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Banknote className="h-3.5 w-3.5 text-emerald-300" /> Fund joiners
            </p>
            <p className="mb-2 text-[11px] text-slate-400">
              Cover part of every other seat. Joiners pay less; you pay the difference. Funded rooms cannot be joined
              with borrow.
            </p>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(fundedPct * 100)}
              onChange={(e) => setFundedPct(Number(e.target.value) / 100)}
              className="w-full accent-emerald-400"
            />
            <p className="mt-1 text-sm font-semibold text-emerald-200">{pctLabel(fundedPct)} funded</p>
            {fundedPct > 0 && (
              <p className="text-[11px] text-slate-500">
                Joiners pay {formatCredits(joinerPay)} SH · you cover {formatCredits(fundCover)} SH for {players - 1}{" "}
                other seat{players - 1 === 1 ? "" : "s"}.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              sound.click();
              setIsPrivate((v) => !v);
            }}
            className={`rounded-xl border p-3 text-left transition-colors ${
              isPrivate ? "border-fuchsia-400/40 bg-fuchsia-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5"
            }`}
          >
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Lock className="h-3.5 w-3.5 text-fuchsia-300" /> Private room
            </p>
            <p className="text-sm font-semibold text-white">{isPrivate ? "Private — link only" : "Public lobby"}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {isPrivate
                ? "Hidden from the battle list. Anyone with the room link can still join."
                : "Listed in the lobby so anyone can find and join it."}
            </p>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl bg-black/20 p-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Players</p>
            <p className="font-mono text-lg font-bold text-white">{players}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cost / seat</p>
            <p className="font-mono text-lg font-bold text-white">{formatCredits(costPerPlayer)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Your cost</p>
            <p className="font-mono text-lg font-bold text-amber-300">{formatCredits(youPay)}</p>
          </div>
        </div>
        <p className="-mt-3 text-center text-[11px] text-slate-500">
          You always pay your own seat ({formatCredits(costPerPlayer)} SH)
          {fundedPct > 0
            ? ` plus ${pctLabel(fundedPct)} of every other seat (${formatCredits(fundCover)} SH). Joiners pay ${formatCredits(joinerPay)} SH.`
            : `. Other players cover their own seats when they join.`}{" "}
          Total pot once every seat is filled: {formatCredits(totalCost)} SH.
        </p>

        <button
          onClick={() => {
            sound.click();
            handleCreate();
          }}
          className="btn-primary w-full py-3"
        >
          Create Battle · {formatCredits(youPay)} SH
        </button>
      </div>

      <AddCasesModal
        key={modalOpen ? "add-cases-open" : "add-cases-closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entries={cases}
        onChange={setCases}
      />
      <CasePreviewModal caseId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}