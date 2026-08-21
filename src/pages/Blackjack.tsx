import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  freshDeck,
  shuffleDeck,
  handTotal,
  isBlackjack,
  evaluatePerfectPairs,
  evaluateTwentyOnePlusThree,
  type Card,
} from "../lib/blackjack";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCredits, formatPercent } from "../lib/format";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { HOUSE_EDGE, rakebackAmount } from "../lib/rakeback";
import { takeStake } from "../lib/stake";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { PlayingCard } from "../components/ui/PlayingCard";

type Phase = "betting" | "player-turn" | "dealer-turn" | "settled";
type Outcome = "win" | "lose" | "push" | "blackjack" | null;

// Traditional poker-chip denominations & colors — a generic, universal
// casino convention (not tied to any specific brand).
type ChipDef = { value: number; from: string; to: string; text: string; custom?: boolean };

const CHIPS: ChipDef[] = [
  { value: 10, from: "#f8fafc", to: "#cbd5e1", text: "#0f172a" },
  { value: 50, from: "#fda4af", to: "#e11d48", text: "#fff" },
  { value: 100, from: "#93c5fd", to: "#1d4ed8", text: "#fff" },
  { value: 500, from: "#86efac", to: "#15803d", text: "#fff" },
  { value: 1000, from: "#1f2937", to: "#000000", text: "#fff" },
];

const CUSTOM_CHIP_STYLE = { from: "#c4b5fd", to: "#6d28d9", text: "#fff" } as const;

type SpotId = "pairs" | "main" | "plus3";
type UndoEntry =
  | { kind: "spot"; spot: SpotId; previous: number }
  | { kind: "hit"; player: Card[]; deck: Card[] }
  | { kind: "double"; player: Card[]; deck: Card[]; extraStake: number };

function ChipFace({ chip, size }: { chip: ChipDef; size: number }) {
  const rim = Math.max(2, Math.round(size * 0.07));
  const label =
    chip.value >= 1000
      ? `${chip.value % 1000 === 0 ? chip.value / 1000 : (chip.value / 1000).toFixed(1)}k`
      : String(chip.value);
  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full font-black select-none"
      style={{
        width: size,
        height: size,
        color: chip.text,
        background: `radial-gradient(circle at 50% 50%, ${chip.to} 0%, ${chip.to} 58%, #0b1220 100%)`,
        boxShadow: `0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.16)}px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -${Math.max(2, rim)}px 0 rgba(0,0,0,0.38)`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-[7%] rounded-full"
        style={{
          border: `${rim}px dashed rgba(255,255,255,0.42)`,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
        }}
      />
      <span
        className="pointer-events-none absolute inset-[22%] rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, ${chip.from}, ${chip.to} 78%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.28)",
        }}
      />
      <span
        className="pointer-events-none absolute inset-x-[18%] top-[9%] h-[18%] rounded-full opacity-50"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55), transparent)" }}
      />
      <span className="relative z-10 tabular-nums leading-none" style={{ fontSize: size > 42 ? 12 : size > 34 ? 10 : 8 }}>
        {label}
      </span>
    </div>
  );
}

function stackFromAmount(amount: number): ChipDef[] {
  const stack: ChipDef[] = [];
  let left = amount;
  for (const chip of [...CHIPS].slice().reverse()) {
    while (left >= chip.value && stack.length < 8) {
      stack.push(chip);
      left -= chip.value;
    }
  }
  if (left > 0) {
    stack.push({ value: left, ...CUSTOM_CHIP_STYLE, custom: true });
  }
  return stack;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function BetSpot({
  label,
  hint,
  amount,
  setAmount,
  disabled,
  ringColor,
  big = false,
  highlighted,
  armed,
  dropRef,
  onCircleClick,
  onClear,
}: {
  label: string;
  hint?: string;
  amount: number;
  setAmount: React.Dispatch<React.SetStateAction<number>>;
  disabled: boolean;
  ringColor: string;
  big?: boolean;
  highlighted: boolean;
  armed: boolean;
  dropRef: React.RefObject<HTMLButtonElement | null>;
  onCircleClick: () => void;
  onClear?: () => void;
}) {
  const stack = stackFromAmount(amount);
  const lit = highlighted || armed;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        ref={dropRef}
        disabled={disabled}
        onClick={onCircleClick}
        title={armed ? "Click to place the selected chip" : stack.length ? "Click stack to remove the top chip" : "Select a chip, then click here"}
        className={`relative flex items-center justify-center rounded-full border-2 bg-black/25 text-center transition-all disabled:opacity-50 ${big ? "h-28 w-28" : "h-20 w-20"}`}
        style={{
          borderColor: lit ? ringColor : `${ringColor}70`,
          borderStyle: "solid",
          boxShadow: highlighted
            ? `0 0 22px ${ringColor}88, inset 0 0 18px ${ringColor}22`
            : armed
              ? `0 0 16px ${ringColor}55, inset 0 0 14px ${ringColor}18`
              : "inset 0 0 16px rgba(0,0,0,0.35)",
        }}
      >
        {stack.length === 0 ? (
          <p className={`font-mono font-semibold text-white/40 ${big ? "text-sm" : "text-[10px]"}`}>
            {armed ? "Click to bet" : "Click or drop"}
          </p>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            {stack.map((chip, i) => (
              <span key={i} className="absolute" style={{ transform: `translateY(${-i * 4}px)`, zIndex: i + 1 }}>
                <ChipFace chip={chip} size={big ? 44 : 34} />
              </span>
            ))}
          </span>
        )}
      </button>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100/90">{label}</p>
        {hint && <p className="text-[9px] text-emerald-200/50">{hint}</p>}
        <p className="mt-0.5 font-mono text-xs font-bold text-white">{formatCredits(amount)} SH</p>
      </div>
      <button
        disabled={disabled || amount === 0}
        onClick={() => {
          sound.click();
          if (onClear) onClear();
          else setAmount(0);
        }}
        className="text-[10px] font-medium uppercase tracking-wide text-slate-400 hover:text-white disabled:opacity-30"
      >
        Clear
      </button>
    </div>
  );
}

export function Blackjack() {
  const [bet, setBet] = useState(0);
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet] = useState(0);
  const [sideBetMessages, setSideBetMessages] = useState<string[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [message, setMessage] = useState("");
  const [drag, setDrag] = useState<{ chip: ChipDef; x: number; y: number } | null>(null);
  const [hoverSpot, setHoverSpot] = useState<SpotId | null>(null);
  const [selectedChip, setSelectedChip] = useState<ChipDef | null>(null);
  const [customBetInput, setCustomBetInput] = useState("25");
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [pendingBust, setPendingBust] = useState(false);
  const dragRef = useRef<{ chip: ChipDef; x: number; y: number } | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const pairsRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const plus3Ref = useRef<HTMLButtonElement>(null);
  const betsRef = useRef({ main: 0, pairs: 0, plus3: 0 });
  const undoStackRef = useRef<UndoEntry[]>([]);
  betsRef.current = { main: bet, pairs: perfectPairsBet, plus3: twentyOnePlusThreeBet };
  undoStackRef.current = undoStack;

  const customBetValue = Math.max(1, Math.round(Number(customBetInput)) || 1);
  const customChip: ChipDef = { value: customBetValue, ...CUSTOM_CHIP_STYLE, custom: true };

  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const playRoll = useFairnessStore((s) => s.play);

  const playerTotal = handTotal(player);
  const dealerTotal = handTotal(dealer);
  const canUndo = undoStack.length > 0 && !busy && (phase === "betting" || phase === "player-turn");

  function refundStake(amount: number) {
    if (amount <= 0) return;
    credit(amount);
    const rb = rakebackAmount(amount, HOUSE_EDGE.blackjack);
    if (rb <= 0) return;
    useEconomyStore.setState((s) => ({
      pendingRakeback: Math.max(0, (s.pendingRakeback ?? 0) - rb),
    }));
  }

  function pushUndo(entry: UndoEntry) {
    const next = [...undoStackRef.current, entry];
    undoStackRef.current = next;
    setUndoStack(next);
  }

  function snapshotSpot(id: SpotId) {
    pushUndo({ kind: "spot", spot: id, previous: betsRef.current[id] });
  }

  function applySpot(id: SpotId, value: number) {
    betsRef.current[id] = value;
    if (id === "main") setBet(value);
    else if (id === "pairs") setPerfectPairsBet(value);
    else setTwentyOnePlusThreeBet(value);
  }

  function undo() {
    if (busy || (phase !== "betting" && phase !== "player-turn")) return;
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    if (!last) return;
    sound.click();
    const next = undoStackRef.current.slice(0, -1);
    undoStackRef.current = next;
    setUndoStack(next);
    if (last.kind === "spot") {
      applySpot(last.spot, last.previous);
      return;
    }
    setPlayer(last.player);
    setDeck(last.deck);
    setPendingBust(false);
    setMessage("");
    if (last.kind === "double") {
      setDoubled(false);
      refundStake(last.extraStake);
    }
  }

  async function deal() {
    if (busy) return;
    const sideBetsTotal = perfectPairsBet + twentyOnePlusThreeBet;
    if (bet < 0) return;
    if (!takeStake(bet + sideBetsTotal, HOUSE_EDGE.blackjack)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    setBusy(true);
    setDoubled(false);
    setOutcome(null);
    setMessage("");
    setSideBetMessages([]);
    setDealerRevealed(false);
    setPendingBust(false);
    setUndoStack([]);
    undoStackRef.current = [];

    const rolls = await playRoll(52);
    const freshShuffled = shuffleDeck(freshDeck(), rolls);
    const d = [...freshShuffled];

    const p: Card[] = [];
    const dl: Card[] = [];
    setPlayer([]);
    setDealer([]);

    p.push(d.shift()!);
    setPlayer([...p]);
    sound.deal();
    await sleep(320);

    dl.push(d.shift()!);
    setDealer([...dl]);
    sound.deal();
    await sleep(320);

    p.push(d.shift()!);
    setPlayer([...p]);
    sound.deal();
    await sleep(320);

    dl.push(d.shift()!);
    setDealer([...dl]);
    sound.deal();
    await sleep(320);

    setDeck(d);
    setPhase("player-turn");
    setBusy(false);

    if (sideBetsTotal > 0) {
      resolveSideBets(p as [Card, Card], dl[0]);
    }

    if (isBlackjack(p)) {
      await sleep(500);
      await resolveRound(p, dl, d, true);
    }
  }

  function resolveSideBets(initialHand: [Card, Card], dealerUpCard: Card) {
    const messages: string[] = [];
    let totalWinnings = 0;

    if (perfectPairsBet > 0) {
      const pp = evaluatePerfectPairs(initialHand);
      if (pp.tier !== "none") {
        const winnings = perfectPairsBet * (pp.multiplier + 1);
        totalWinnings += winnings;
        messages.push(`Perfect Pairs (${pp.tier}): +${formatCredits(winnings)} SH`);
      } else {
        messages.push(`Perfect Pairs: no pair.`);
      }
    }

    if (twentyOnePlusThreeBet > 0) {
      const combo = evaluateTwentyOnePlusThree([initialHand[0], initialHand[1], dealerUpCard]);
      if (combo.tier !== "none") {
        const winnings = twentyOnePlusThreeBet * (combo.multiplier + 1);
        totalWinnings += winnings;
        messages.push(`21+3 (${combo.tier}): +${formatCredits(winnings)} SH`);
      } else {
        messages.push(`21+3: no hand.`);
      }
    }

    if (totalWinnings > 0) {
      credit(totalWinnings);
      sound.win("small");
    }
    setSideBetMessages(messages);
    messages.forEach((m) => push(m, m.includes("+") ? "success" : "info"));
  }

  async function hit() {
    if (phase !== "player-turn" || busy || pendingBust) return;
    setBusy(true);
    pushUndo({ kind: "hit", player: [...player], deck: [...deck] });
    const d = [...deck];
    const card = d.shift()!;
    const p = [...player, card];
    setDeck(d);
    setPlayer(p);
    sound.deal();
    await sleep(280);
    setBusy(false);

    const total = handTotal(p).total;
    if (total > 21) {
      setPendingBust(true);
      setMessage("Busted — undo or end the hand.");
    }
  }

  async function stand() {
    if (phase !== "player-turn" || busy) return;
    await resolveRound(player, dealer, deck, false);
  }

  async function double() {
    if (phase !== "player-turn" || busy || pendingBust || player.length !== 2) return;
    if (!takeStake(bet, HOUSE_EDGE.blackjack)) {
      push("Not enough Shards to double.", "danger");
      return;
    }
    pushUndo({ kind: "double", player: [...player], deck: [...deck], extraStake: bet });
    setDoubled(true);
    setBusy(true);
    const d = [...deck];
    const card = d.shift()!;
    const p = [...player, card];
    setDeck(d);
    setPlayer(p);
    sound.deal();
    await sleep(300);
    setBusy(false);

    if (handTotal(p).total > 21) {
      setPendingBust(true);
      setMessage("Busted — undo or end the hand.");
      return;
    }
    await resolveRound(p, dealer, d, false, true);
  }

  async function resolveRound(p: Card[], dl: Card[], d: Card[], playerHadBlackjack: boolean, forceStand = false) {
    setBusy(true);
    setPhase("dealer-turn");
    setDealerRevealed(true);
    setPendingBust(false);
    setUndoStack([]);
    undoStackRef.current = [];
    sound.cardFlip();
    await sleep(500);

    const playerBust = handTotal(p).total > 21;
    let dealerHand = [...dl];
    let deckLeft = [...d];

    if (!playerBust && !playerHadBlackjack) {
      while (true) {
        const t = handTotal(dealerHand);
        if (t.total > 21) break;
        if (t.total > 17 || (t.total === 17 && !t.soft)) break;
        const card = deckLeft.shift();
        if (!card) break;
        dealerHand = [...dealerHand, card];
        setDealer(dealerHand);
        setDeck(deckLeft);
        sound.deal();
        await sleep(700);
      }
    }

    const finalBet = doubled || forceStand ? bet * 2 : bet;
    const pTotal = handTotal(p).total;
    const dTotal = handTotal(dealerHand).total;
    const dealerBust = dTotal > 21;

    let result: Outcome;
    let winnings = 0;

    if (playerHadBlackjack && !isBlackjack(dealerHand)) {
      result = "blackjack";
      winnings = finalBet + finalBet * 1.5;
    } else if (playerBust) {
      result = "lose";
      winnings = 0;
    } else if (dealerBust) {
      result = "win";
      winnings = finalBet * 2;
    } else if (pTotal > dTotal) {
      result = "win";
      winnings = finalBet * 2;
    } else if (pTotal < dTotal) {
      result = "lose";
      winnings = 0;
    } else {
      result = "push";
      winnings = finalBet;
    }

    if (winnings > 0) credit(winnings);
    recordRound(finalBet, winnings, "blackjack");

    const msgMap: Record<Exclude<Outcome, null>, string> = {
      blackjack: `Blackjack! Won ${formatCredits(winnings)} SH.`,
      win: dealerBust ? `Dealer busts! Won ${formatCredits(winnings)} SH.` : `You win ${formatCredits(winnings)} SH.`,
      lose: playerBust ? "Busted." : "Dealer wins.",
      push: "Push — bet returned.",
    };

    setOutcome(result);
    setMessage(msgMap[result!]);
    setPhase("settled");
    setBusy(false);

    if (result === "win" || result === "blackjack") {
      sound.win(result === "blackjack" ? "big" : "small");
      push(msgMap[result], "success");
    } else if (result === "lose") {
      sound.lose();
      push(msgMap[result], "danger");
    } else {
      push(msgMap[result!], "info");
    }
  }

  function newRound() {
    setPlayer([]);
    setDealer([]);
    setPhase("betting");
    setOutcome(null);
    setDealerRevealed(false);
    setDoubled(false);
    setMessage("");
    setSideBetMessages([]);
    setPendingBust(false);
    setUndoStack([]);
    undoStackRef.current = [];
  }

  const bettingLocked = phase !== "betting";

  const hitSpot = useCallback((x: number, y: number): SpotId | null => {
    const checks: [SpotId, React.RefObject<HTMLButtonElement | null>][] = [
      ["pairs", pairsRef],
      ["main", mainRef],
      ["plus3", plus3Ref],
    ];
    for (const [id, ref] of checks) {
      const r = ref.current?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }, []);

  function addToSpot(id: SpotId, value: number) {
    snapshotSpot(id);
    sound.chip();
    applySpot(id, betsRef.current[id] + value);
  }

  function removeTop(id: SpotId) {
    if (bettingLocked) return;
    const amount = betsRef.current[id];
    const stack = stackFromAmount(amount);
    const top = stack[stack.length - 1];
    if (!top) return;
    snapshotSpot(id);
    sound.click();
    applySpot(id, Math.max(0, amount - top.value));
  }

  function clearSpot(id: SpotId) {
    if (bettingLocked) return;
    const amount = betsRef.current[id];
    if (amount === 0) return;
    snapshotSpot(id);
    applySpot(id, 0);
  }

  function handleSpotClick(id: SpotId) {
    if (bettingLocked) return;
    if (Date.now() < ignoreClickUntilRef.current) return;
    const chip = selectedChip?.custom ? customChip : selectedChip;
    if (chip) {
      addToSpot(id, chip.value);
      return;
    }
    removeTop(id);
  }

  function onChipClick(chip: ChipDef) {
    if (bettingLocked) return;
    if (Date.now() < ignoreClickUntilRef.current) return;
    setSelectedChip((prev) => {
      if (chip.custom) return prev?.custom ? null : chip;
      if (prev && !prev.custom && prev.value === chip.value) return null;
      return chip;
    });
  }

  function onChipPointerDown(e: React.PointerEvent, chip: ChipDef) {
    if (bettingLocked || e.button !== 0) return;
    const originX = e.clientX;
    const originY = e.clientY;
    const pointerId = e.pointerId;
    let dragged = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!dragged && Math.hypot(ev.clientX - originX, ev.clientY - originY) > 8) {
        dragged = true;
        ignoreClickUntilRef.current = Date.now() + 600;
        const next = { chip, x: ev.clientX, y: ev.clientY };
        dragRef.current = next;
        setDrag(next);
        setSelectedChip(chip);
      }
      if (!dragged) return;
      const next = { chip, x: ev.clientX, y: ev.clientY };
      dragRef.current = next;
      setDrag(next);
      setHoverSpot(hitSpot(ev.clientX, ev.clientY));
    };

    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!dragged) return;
      ignoreClickUntilRef.current = Date.now() + 400;
      const spot = hitSpot(ev.clientX, ev.clientY);
      if (spot && dragRef.current) addToSpot(spot, dragRef.current.chip.value);
      dragRef.current = null;
      setDrag(null);
      setHoverSpot(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const activeChip = bettingLocked ? null : selectedChip?.custom ? customChip : selectedChip;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="surface p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Blackjack</h2>
              <p className="text-[11px] font-normal text-slate-500">0 = demo bet</p>
            </div>
            <div className="flex items-center gap-2">
              <InfoButton title="Blackjack — RTP & House Edge">
              <StatRow label="Rules" value="Dealer stands on all 17s" />
              <StatRow label="Blackjack payout" value="3:2" />
              <StatRow label="Est. RTP (optimal play)" value={formatPercent(0.9941, 2)} />
              <StatRow label="House edge" value={formatPercent(0.0059, 2)} />
              <p>Single 52-card shoe reshuffled every hand, ordering derived from the provably-fair seed below.</p>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Optional side bets</p>
              <StatRow label="Perfect Pairs — mixed pair" value="6:1" />
              <StatRow label="Perfect Pairs — colored pair" value="12:1" />
              <StatRow label="Perfect Pairs — perfect pair" value="25:1" />
              <StatRow label="21+3 — flush" value="5:1" />
              <StatRow label="21+3 — straight" value="10:1" />
              <StatRow label="21+3 — three of a kind" value="30:1" />
              <StatRow label="21+3 — straight flush" value="40:1" />
              <p>
                Place chips on the felt to bet — select a chip then click a circle, or drag from the tray onto a circle.
                Click a stack with no chip selected to peel the top chip off. Use Undo to reverse the last chip or the last
                hit (including a busting hit, before you end the hand). Side bets resolve immediately after the initial
                deal, independent of how the main hand plays out.
              </p>
            </InfoButton>
            </div>
          </div>

          {phase === "betting" || phase === "settled" ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  sound.click();
                  if (phase === "settled") newRound();
                  else void deal();
                }}
                disabled={busy}
                className="btn-primary flex-1 py-3 disabled:opacity-50"
              >
                {phase === "settled" ? "New Round" : "Deal"}
              </button>
              {phase === "betting" && (
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition-transform duration-150 active:scale-95 disabled:opacity-40"
                >
                  Undo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    sound.click();
                    void hit();
                  }}
                  disabled={busy || phase !== "player-turn" || pendingBust}
                  className="rounded-xl bg-emerald-500 py-2.5 font-semibold text-bg-950 transition-transform duration-150 active:scale-95 disabled:opacity-40"
                >
                  Hit
                </button>
                <button
                  onClick={() => {
                    sound.click();
                    void stand();
                  }}
                  disabled={busy || phase !== "player-turn"}
                  className="rounded-xl bg-sky-500 py-2.5 font-semibold text-bg-950 transition-transform duration-150 active:scale-95 disabled:opacity-40"
                >
                  {pendingBust ? "End hand" : "Stand"}
                </button>
                <button
                  onClick={() => {
                    sound.click();
                    void double();
                  }}
                  disabled={busy || phase !== "player-turn" || pendingBust || player.length !== 2}
                  className="rounded-xl bg-amber-500 py-2.5 font-semibold text-bg-950 transition-transform duration-150 active:scale-95 disabled:opacity-40"
                >
                  Double
                </button>
              </div>
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-white transition-transform duration-150 active:scale-95 disabled:opacity-40"
              >
                Undo
              </button>
            </div>
          )}

          {(phase === "settled" || pendingBust) && message && (
            <div
              className={`mt-4 rounded-lg p-3 text-center text-sm font-semibold ${
                outcome === "win" || outcome === "blackjack"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : outcome === "push"
                    ? "bg-slate-500/15 text-slate-300"
                    : "bg-rose-500/15 text-rose-300"
              }`}
            >
              {message}
            </div>
          )}

          {sideBetMessages.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg bg-black/20 p-2 text-center text-xs text-slate-300">
              {sideBetMessages.map((m, i) => (
                <p key={i}>{m}</p>
              ))}
            </div>
          )}
        </div>
        <ProvablyFairPanel />
      </div>

      <div
        className="relative overflow-hidden rounded-[3rem] border-[10px] border-bg-900 p-4 sm:p-8"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, #0f3d2e 0%, #0a2b21 55%, #061a15 100%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.55)",
        }}
      >
        <div className="pointer-events-none absolute left-1/2 top-[30%] w-full max-w-md -translate-x-1/2 -translate-y-1/2 text-center opacity-25">
          <p className="text-lg font-black uppercase tracking-widest text-emerald-200 sm:text-2xl">
            Blackjack Pays 3 to 2
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80 sm:text-xs">
            Dealer stands on 17
          </p>
        </div>

        <div className="relative mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-200/70">
            Dealer {dealerRevealed && `· ${dealerTotal.total}`}
          </p>
          <div className="flex min-h-32 flex-wrap gap-2">
            <AnimatePresence>
              {dealer.map((c, i) => (
                <PlayingCard key={`${c.rank}${c.suit}-${i}`} card={c} hidden={i === 1 && !dealerRevealed} delay={i * 0.12} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-200/70">
            You {player.length > 0 && `· ${playerTotal.total}${playerTotal.soft ? " (soft)" : ""}`}
          </p>
          <div className="flex min-h-32 flex-wrap gap-2">
            <AnimatePresence>
              {player.map((c, i) => (
                <PlayingCard key={`${c.rank}${c.suit}-${i}`} card={c} delay={i * 0.12} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {phase === "betting" && player.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mb-4 text-center text-emerald-200/60">
            Select a chip (or type a custom size) and click a circle, or drag onto a circle. Click a stack to peel the
            top chip off, or use Undo for the last chip / last hit.
          </motion.p>
        )}

        <div className="relative flex flex-wrap items-start justify-center gap-8 border-t border-white/10 pt-6">
          <BetSpot
            label="Perfect Pairs"
            hint="up to 25:1"
            amount={perfectPairsBet}
            setAmount={setPerfectPairsBet}
            disabled={bettingLocked}
            ringColor="#38bdf8"
            highlighted={hoverSpot === "pairs"}
            armed={Boolean(activeChip) && !drag}
            dropRef={pairsRef}
            onCircleClick={() => handleSpotClick("pairs")}
            onClear={() => clearSpot("pairs")}
          />
          <BetSpot
            label="Main Bet"
            amount={bet}
            setAmount={setBet}
            disabled={bettingLocked}
            ringColor="#e879f9"
            big
            highlighted={hoverSpot === "main"}
            armed={Boolean(activeChip) && !drag}
            dropRef={mainRef}
            onCircleClick={() => handleSpotClick("main")}
            onClear={() => clearSpot("main")}
          />
          <BetSpot
            label="21+3"
            hint="up to 40:1"
            amount={twentyOnePlusThreeBet}
            setAmount={setTwentyOnePlusThreeBet}
            disabled={bettingLocked}
            ringColor="#fbbf24"
            highlighted={hoverSpot === "plus3"}
            armed={Boolean(activeChip) && !drag}
            dropRef={plus3Ref}
            onCircleClick={() => handleSpotClick("plus3")}
            onClear={() => clearSpot("plus3")}
          />
        </div>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-black/25 px-4 py-5">
          <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/50">Chip tray</p>
          {CHIPS.map((chip) => {
            const selected = Boolean(activeChip) && !activeChip?.custom && activeChip?.value === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                disabled={bettingLocked}
                aria-pressed={selected}
                draggable={false}
                onClick={() => onChipClick(chip)}
                onPointerDown={(e) => onChipPointerDown(e, chip)}
                className={`relative rounded-full touch-none select-none transition-[transform,opacity,box-shadow] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
                  drag ? "cursor-grabbing" : "cursor-pointer"
                } ${selected ? "scale-110" : "hover:scale-105 active:scale-95"}`}
                style={{
                  boxShadow: selected ? `0 0 0 3px #f8fafc, 0 0 18px ${chip.from}` : "0 0 0 0 transparent",
                  opacity: activeChip && !selected ? 0.42 : 1,
                }}
                title={selected ? "Selected — click again to deselect, or click a circle to bet" : "Click to select, or drag onto a circle"}
              >
                <ChipFace chip={chip} size={48} />
                {selected && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-white">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-4">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-200/50">Custom</span>
              <input
                type="number"
                min={1}
                step={1}
                disabled={bettingLocked}
                value={customBetInput}
                onChange={(e) => setCustomBetInput(e.target.value)}
                onFocus={() => {
                  if (!bettingLocked) setSelectedChip(customChip);
                }}
                className="w-20 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none focus:border-violet-400/70 disabled:opacity-40"
              />
            </label>
            <button
              type="button"
              disabled={bettingLocked}
              aria-pressed={Boolean(activeChip?.custom)}
              draggable={false}
              onClick={() => onChipClick(customChip)}
              onPointerDown={(e) => onChipPointerDown(e, customChip)}
              className={`relative rounded-full touch-none select-none transition-[transform,opacity,box-shadow] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
                drag ? "cursor-grabbing" : "cursor-pointer"
              } ${activeChip?.custom ? "scale-110" : "hover:scale-105 active:scale-95"}`}
              style={{
                boxShadow: activeChip?.custom ? `0 0 0 3px #f8fafc, 0 0 18px ${CUSTOM_CHIP_STYLE.from}` : "0 0 0 0 transparent",
                opacity: activeChip && !activeChip.custom ? 0.42 : 1,
              }}
              title="Custom bet — type an amount, then click or drag onto a circle"
            >
              <ChipFace chip={customChip} size={48} />
              {activeChip?.custom && (
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-white">
                  Selected
                </span>
              )}
            </button>
          </div>
        </div>

        {drag && (
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
            style={{ left: drag.x, top: drag.y }}
          >
            <ChipFace chip={drag.chip} size={52} />
          </div>
        )}
      </div>
    </div>
  );
}
