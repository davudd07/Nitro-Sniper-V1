import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus } from "lucide-react";
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
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { PlayingCard } from "../components/ui/PlayingCard";

type Phase = "betting" | "player-turn" | "dealer-turn" | "settled";
type Outcome = "win" | "lose" | "push" | "blackjack" | null;

// Traditional poker-chip denominations & colors — a generic, universal
// casino convention (not tied to any specific brand).
const CHIPS = [
  { value: 10, from: "#f8fafc", to: "#cbd5e1", text: "#0f172a" },
  { value: 50, from: "#fda4af", to: "#e11d48", text: "#fff" },
  { value: 100, from: "#93c5fd", to: "#1d4ed8", text: "#fff" },
  { value: 500, from: "#86efac", to: "#15803d", text: "#fff" },
  { value: 1000, from: "#1f2937", to: "#000000", text: "#fff" },
];

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
}: {
  label: string;
  hint?: string;
  amount: number;
  setAmount: React.Dispatch<React.SetStateAction<number>>;
  disabled: boolean;
  ringColor: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-full border-2 border-dashed bg-black/30 text-center shadow-inner ${big ? "h-24 w-24" : "h-16 w-16"}`}
        style={{ borderColor: `${ringColor}80` }}
      >
        <div>
          <p className={`font-mono font-bold text-white ${big ? "text-lg" : "text-xs"}`}>{formatCredits(amount)}</p>
          {big && <p className="text-[9px] text-slate-400">SH</p>}
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{label}</p>
      {hint && <p className="-mt-1.5 text-[9px] text-slate-500">{hint}</p>}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {CHIPS.map((chip) => (
          <button
            key={chip.value}
            disabled={disabled}
            onClick={() => {
              sound.chip();
              setAmount((v) => v + chip.value);
            }}
            className={`grid shrink-0 place-items-center rounded-full border border-dashed border-white/40 font-bold shadow transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-90 disabled:opacity-40 ${big ? "h-8 w-8 text-[10px]" : "h-6 w-6 text-[8px]"}`}
            style={{ background: `radial-gradient(circle at 35% 30%, ${chip.from}, ${chip.to})`, color: chip.text }}
          >
            {chip.value >= 1000 ? `${chip.value / 1000}k` : chip.value}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={amount}
          disabled={disabled}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="w-16 rounded-md bg-black/40 px-1.5 py-1 text-center font-mono text-[11px] text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/50 disabled:opacity-40"
        />
        <button
          disabled={disabled}
          onClick={() => {
            sound.click();
            setAmount(0);
          }}
          className="rounded-md border border-white/15 p-1 text-slate-400 transition-all duration-150 hover:bg-white/10 active:scale-90 disabled:opacity-40"
          title="Clear"
        >
          <Minus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function Blackjack() {
  const [bet, setBet] = useState(100);
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

  const spend = useEconomyStore((s) => s.spend);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const playRoll = useFairnessStore((s) => s.play);

  const playerTotal = handTotal(player);
  const dealerTotal = handTotal(dealer);

  async function deal() {
    if (busy || bet <= 0) return;
    const sideBetsTotal = perfectPairsBet + twentyOnePlusThreeBet;
    if (!spend(bet + sideBetsTotal)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
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
    if (!spend(bet)) {
      push("Not enough Shards to double.", "danger");
      return;
    }
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

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Blackjack</h2>
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
                Place chips on the felt to bet — side bets resolve immediately after the initial deal, independent of
                how the main hand plays out.
              </p>
            </InfoButton>
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
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mb-4 text-center text-emerald-200/50">
            Place your bets on the felt below, then hit Deal.
          </motion.p>
        )}

        <div className="relative flex flex-wrap items-start justify-center gap-6 border-t border-white/10 pt-6">
          <BetSpot
            label="Perfect Pairs"
            hint="up to 25:1"
            amount={perfectPairsBet}
            setAmount={setPerfectPairsBet}
            disabled={bettingLocked}
            ringColor="#38bdf8"
          />
          <BetSpot label="Main Bet" amount={bet} setAmount={setBet} disabled={bettingLocked} ringColor="#e879f9" big />
          <BetSpot
            label="21+3"
            hint="up to 40:1"
            amount={twentyOnePlusThreeBet}
            setAmount={setTwentyOnePlusThreeBet}
            disabled={bettingLocked}
            ringColor="#fbbf24"
          />
        </div>
      </div>
    </div>
  );
}
