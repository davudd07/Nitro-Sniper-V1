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
import { DemoBetBadge } from "../components/ui/DemoBetBadge";
import { HOUSE_EDGE } from "../lib/rakeback";
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

function ChipFace({ chip, size }: { chip: ChipDef; size: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold select-none"
      style={{
        width: size,
        height: size,
        fontSize: size > 40 ? 12 : 10,
        color: chip.text,
        background: `radial-gradient(circle at 32% 28%, ${chip.from}, ${chip.to})`,
        boxShadow: "0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.25)",
        border: "2px solid rgba(255,255,255,0.28)",
      }}
    >
      {chip.value >= 1000
        ? `${chip.value % 1000 === 0 ? chip.value / 1000 : (chip.value / 1000).toFixed(1)}k`
        : chip.value}
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
          setAmount(0);
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
  const dragRef = useRef<{ chip: ChipDef; x: number; y: number } | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const pairsRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const plus3Ref = useRef<HTMLButtonElement>(null);

  const customBetValue = Math.max(1, Math.round(Number(customBetInput)) || 1);
  const customChip: ChipDef = { value: customBetValue, ...CUSTOM_CHIP_STYLE, custom: true };

  const awardRakeback = useEconomyStore((s) => s.awardRakeback);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const playRoll = useFairnessStore((s) => s.play);

  const playerTotal = handTotal(player);
  const dealerTotal = handTotal(dealer);

  async function deal() {
    if (busy || bet <= 0) return;
    const sideBetsTotal = perfectPairsBet + twentyOnePlusThreeBet;
    awardRakeback(bet + sideBetsTotal, HOUSE_EDGE.blackjack);
    setBusy(true);
    setDoubled(false);
    setOutcome(null);
    setMessage("");
    setSideBetMessages([]);
    setDealerRevealed(false);

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
    if (phase !== "player-turn" || busy) return;
    setBusy(true);
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
      await resolveRound(p, dealer, d, false);
    }
  }

  async function stand() {
    if (phase !== "player-turn" || busy) return;
    await resolveRound(player, dealer, deck, false);
  }

  async function double() {
    if (phase !== "player-turn" || busy || player.length !== 2) return;
    awardRakeback(bet, HOUSE_EDGE.blackjack);
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
    await resolveRound(p, dealer, d, false, true);
  }

  async function resolveRound(p: Card[], dl: Card[], d: Card[], playerHadBlackjack: boolean, forceStand = false) {
    setBusy(true);
    setPhase("dealer-turn");
    setDealerRevealed(true);
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
    recordRound(finalBet, winnings);

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
    sound.chip();
    if (id === "main") setBet((v) => v + value);
    else if (id === "pairs") setPerfectPairsBet((v) => v + value);
    else setTwentyOnePlusThreeBet((v) => v + value);
  }

  function removeTop(id: SpotId) {
    if (bettingLocked) return;
    const amount = id === "main" ? bet : id === "pairs" ? perfectPairsBet : twentyOnePlusThreeBet;
    const stack = stackFromAmount(amount);
    const top = stack[stack.length - 1];
    if (!top) return;
    sound.click();
    const next = Math.max(0, amount - top.value);
    if (id === "main") setBet(next);
    else if (id === "pairs") setPerfectPairsBet(next);
    else setTwentyOnePlusThreeBet(next);
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Blackjack</h2>
            <div className="flex items-center gap-2">
              <DemoBetBadge />
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
                Click a stack with no chip selected to peel the top chip off. Side bets resolve immediately after the
                initial deal, independent of how the main hand plays out.
              </p>
            </InfoButton>
            </div>
          </div>

          {phase === "betting" || phase === "settled" ? (
            <button
              onClick={() => {
                sound.click();
                if (phase === "settled") newRound();
                else void deal();
              }}
              disabled={busy || (phase === "betting" && bet <= 0)}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {phase === "settled" ? "New Round" : "Deal"}
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sound.click();
                  void hit();
                }}
                disabled={busy || phase !== "player-turn"}
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
                Stand
              </button>
              <button
                onClick={() => {
                  sound.click();
                  void double();
                }}
                disabled={busy || phase !== "player-turn" || player.length !== 2}
                className="rounded-xl bg-amber-500 py-2.5 font-semibold text-bg-950 transition-transform duration-150 active:scale-95 disabled:opacity-40"
              >
                Double
              </button>
            </div>
          )}

          {phase === "settled" && (
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
            top chip off.
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
                className={`relative rounded-full touch-none select-none transition-[transform,opacity,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                  drag ? "cursor-grabbing" : "cursor-pointer"
                } ${selected ? "scale-110" : "hover:scale-105"}`}
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
              className={`relative rounded-full touch-none select-none transition-[transform,opacity,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                drag ? "cursor-grabbing" : "cursor-pointer"
              } ${activeChip?.custom ? "scale-110" : "hover:scale-105"}`}
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
