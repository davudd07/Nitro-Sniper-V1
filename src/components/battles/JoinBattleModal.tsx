import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Banknote, Handshake } from "lucide-react";
import type { BattleConfig } from "../../store/battleStore";
import { BATTLE_MODES, totalPlayers } from "../../data/battleModes";
import {
  MAX_BORROW_PCT,
  fundedSeatCost,
  joinCost,
  keepPct,
  pctLabel,
} from "../../lib/battleFinance";
import { BorrowPctSlider } from "./BorrowPctSlider";
import { CashAmount } from "../ui/CurrencyIcon";
import { battlePlayCurrency } from "../../lib/playWallet";
import { sound } from "../../lib/sound";

export function JoinBattleModal({
  battle,
  onClose,
  onConfirm,
  heading = "Join battle",
}: {
  battle: BattleConfig;
  onClose: () => void;
  onConfirm: (borrowPct: number) => void;
  heading?: string;
}) {
  const funded = battle.fundedPct > 0;
  const [borrowPct, setBorrowPct] = useState(0);
  const mode = BATTLE_MODES.find((m) => m.id === battle.modeId);
  const seats = mode ? totalPlayers(mode) : 0;
  const seatAfterFund = fundedSeatCost(battle.costPerPlayer, battle.fundedPct);
  const pay = joinCost(battle.costPerPlayer, battle.fundedPct, funded ? 0 : borrowPct);
  const keep = keepPct(funded ? 0 : borrowPct);
  const ledger = battlePlayCurrency(battle);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="surface w-full max-w-md space-y-4 bg-bg-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{heading}</h3>
            <p className="flex flex-wrap items-center gap-1 text-sm text-slate-400">
              {mode?.label ?? "Battle"} · {seats} seats ·{" "}
              <CashAmount wl={battle.costPerPlayer} currency={ledger} iconClassName="h-3.5 w-3.5" /> / seat
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {funded ? (
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <p className="flex items-center gap-1.5 font-semibold">
              <Banknote className="h-4 w-4" />{" "}
              {battle.eventKind === "funded"
                ? "House-funded — free to join"
                : `Creator funded ${pctLabel(battle.fundedPct)}`}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-emerald-200/80">
              You pay <CashAmount wl={seatAfterFund} currency={ledger} iconClassName="h-3 w-3" /> instead of{" "}
              <CashAmount wl={battle.costPerPlayer} currency={ledger} iconClassName="h-3 w-3" />.
              Borrow is disabled on funded battles.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <Handshake className="h-4 w-4 text-sky-300" /> Borrow
            </p>
            <p className="text-xs text-slate-400">
              Borrow any whole percent from 0–{pctLabel(MAX_BORROW_PCT)} of the seat. You pay less now, but you only
              keep the unborrowed share of any winnings.
            </p>
            <BorrowPctSlider allowZero value={borrowPct} onChange={setBorrowPct} />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Borrow {pctLabel(borrowPct)}</span>
              <span>Keep {pctLabel(keep)} of winnings</span>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-black/30 px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">You pay</p>
          <p className="flex items-center justify-center font-black text-amber-200">
            <CashAmount wl={pay} currency={ledger} className="text-2xl" iconClassName="h-6 w-6" />
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              sound.click();
              onConfirm(funded ? 0 : borrowPct);
            }}
            className="btn-primary flex-1 py-2.5"
          >
            <span className="inline-flex items-center justify-center gap-1">
              Join{pay > 0 ? " ·" : " free"}
              {pay > 0 ? <CashAmount wl={pay} currency={ledger} iconClassName="h-4 w-4" /> : null}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
