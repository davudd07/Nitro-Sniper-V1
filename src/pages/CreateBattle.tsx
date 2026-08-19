import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Swords } from "lucide-react";
import { sound } from "../lib/sound";
import { ModeSelector, ToggleRow } from "../components/battles/ModeSelector";
import { AddCasesModal } from "../components/battles/AddCasesModal";
import { CaseThumb } from "../components/cases/CaseThumb";
import { BATTLE_MODES, totalPlayers } from "../data/battleModes";
import { CASES, getCase } from "../data/cases";
import type { BattleCaseEntry } from "../store/battleStore";
import { useBattleStore } from "../store/battleStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { formatCredits } from "../lib/format";

export function CreateBattle() {
  const navigate = useNavigate();
  const [modeId, setModeId] = useState("2v2");
  const [crazy, setCrazy] = useState(false);
  const [jackpot, setJackpot] = useState(false);
  const [goldSpin, setGoldSpin] = useState(true);
  const [cases, setCases] = useState<BattleCaseEntry[]>([{ caseId: CASES[0].id, count: 3 }]);
  const [modalOpen, setModalOpen] = useState(false);

  const createBattle = useBattleStore((s) => s.createBattle);
  const spend = useEconomyStore((s) => s.spend);
  const push = useToastStore((s) => s.push);

  const mode = BATTLE_MODES.find((m) => m.id === modeId)!;
  const players = totalPlayers(mode);
  const costPerPlayer = useMemo(
    () => cases.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0),
    [cases],
  );
  const totalCost = costPerPlayer * players;
  const totalCaseCount = cases.reduce((s, e) => s + e.count, 0);

  function handleCreate() {
    if (totalCaseCount === 0) {
      push("Add at least one case to the battle.", "warning");
      return;
    }
    if (!spend(costPerPlayer)) {
      push(`You need ${formatCredits(costPerPlayer)} SH to join your own seat.`, "danger");
      return;
    }
    const id = createBattle({ modeId, crazy, jackpot, goldSpin, cases, costPerPlayer });
    push("Battle created! Fill the remaining slots to start.", "success");
    navigate(`/battles/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-6 w-6 text-amber-300" />
        <h1 className="text-2xl font-bold text-white">Create Case Battle</h1>
      </div>

      <div className="space-y-6 rounded-2xl border border-white/10 bg-bg-800/60 p-5">
        <ModeSelector modeId={modeId} onChange={setModeId} />
        <ToggleRow crazy={crazy} jackpot={jackpot} goldSpin={goldSpin} onCrazy={setCrazy} onJackpot={setJackpot} onGoldSpin={setGoldSpin} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cases ({totalCaseCount}/50)
            </p>
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
          {cases.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
              No cases added yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cases.map((e) => {
                const c = getCase(e.caseId);
                if (!c) return null;
                return (
                  <div key={e.caseId} className="overflow-hidden rounded-xl border border-white/10 bg-bg-900/60">
                    <CaseThumb c={c} className="h-16" />
                    <div className="p-2 text-center">
                      <p className="truncate text-xs font-medium text-white">{c.name}</p>
                      <p className="text-[11px] text-slate-500">x{e.count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
            <p className="text-xs text-slate-500">Your cost to join</p>
            <p className="font-mono text-lg font-bold text-amber-300">{formatCredits(costPerPlayer)}</p>
          </div>
        </div>
        <p className="-mt-3 text-center text-[11px] text-slate-500">
          Everyone pays their own seat cost ({formatCredits(costPerPlayer)} SH) — you're only charged for your own
          seat here. Bots and other joining players cover their own seats when they fill in. Total pot once every
          seat is filled: {formatCredits(totalCost)} SH.
        </p>

        <button
          onClick={() => {
            sound.click();
            handleCreate();
          }}
          className="w-full rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 py-3 font-bold text-bg-950 shadow-lg transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
        >
          Create Battle
        </button>
      </div>

      <AddCasesModal open={modalOpen} onClose={() => setModalOpen(false)} entries={cases} onChange={setCases} />
    </div>
  );
}
