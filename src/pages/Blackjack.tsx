import { useState } from "react";
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
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { PlayingCard } from "../components/ui/PlayingCard";

type Phase = "betting" | "player-turn" | "dealer-turn" | "settled";
type Outcome = "win" | "lose" | "push" | "blackjack" | null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function Blackjack() {
  const [bet, setBet] = useState(100);
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet] = useState(0);
  const [sideBetsEnabled, setSideBetsEnabled] = useState(false);
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
    const sideBetsTotal = sideBetsEnabled ? perfectPairsBet + twentyOnePlusThreeBet : 0;
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

    if (sideBetsEnabled && sideBetsTotal > 0) {
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

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-bg-800/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Blackjack</h2>
            <InfoButton title="Blackjack — RTP & House Edge">
              <StatRow label="Rules" value="Dealer stands on all 17s" />
              <StatRow label="Blackjack payout" value="3:2" />
              <StatRow label="Est. RTP (optimal play)" value={formatPercent(0.9941, 2)} />
              <StatRow label="House edge" value={formatPercent(0.0059, 2)} />
              <p>
                Single 52-card shoe reshuffled every hand, ordering derived from the provably-fair seed below.
              </p>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Optional side bets</p>
              <StatRow label="Perfect Pairs — mixed pair" value="6:1" />
              <StatRow label="Perfect Pairs — colored pair" value="12:1" />
              <StatRow label="Perfect Pairs — perfect pair" value="25:1" />
              <StatRow label="21+3 — flush" value="5:1" />
              <StatRow label="21+3 — straight" value="10:1" />
              <StatRow label="21+3 — three of a kind" value="30:1" />
              <StatRow label="21+3 — straight flush" value="40:1" />
              <p>Side bets resolve immediately after the initial deal, independent of how the main hand plays out.</p>
            </InfoButton>
          </div>
          <label className="mb-1 block text-xs text-slate-400">Bet amount</label>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={bet}
              disabled={phase !== "betting"}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 0))}
              className="w-full rounded-lg bg-black/30 px-3 py-2 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/50 disabled:opacity-50"
            />
            <button
              disabled={phase !== "betting"}
              onClick={() => {
                sound.click();
                setBet((b) => Math.max(1, Math.floor(b / 2)));
              }}
              className="rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-slate-300 transition-all duration-150 hover:bg-white/5 active:scale-90 disabled:opacity-50"
            >
              ½
            </button>
            <button
              disabled={phase !== "betting"}
              onClick={() => {
                sound.click();
                setBet((b) => b * 2);
              }}
              className="rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-slate-300 transition-all duration-150 hover:bg-white/5 active:scale-90 disabled:opacity-50"
            >
              2×
            </button>
          </div>

          <button
            disabled={phase !== "betting"}
            onClick={() => {
              sound.click();
              setSideBetsEnabled((v) => !v);
            }}
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Side bets (Perfect Pairs · 21+3)
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${sideBetsEnabled ? "bg-emerald-400" : "bg-white/10"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-out ${sideBetsEnabled ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </span>
          </button>

          {sideBetsEnabled && (
            <div className="mb-4 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
              <div>
                <label className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  Perfect Pairs <span>up to 25:1</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={perfectPairsBet}
                  disabled={phase !== "betting"}
                  onChange={(e) => setPerfectPairsBet(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg bg-black/30 px-3 py-1.5 font-mono text-sm text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  21+3 <span>up to 40:1</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={twentyOnePlusThreeBet}
                  disabled={phase !== "betting"}
                  onChange={(e) => setTwentyOnePlusThreeBet(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg bg-black/30 px-3 py-1.5 font-mono text-sm text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/50 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {phase === "betting" || phase === "settled" ? (
            <button
              onClick={() => {
                sound.click();
                if (phase === "settled") newRound();
                else void deal();
              }}
              disabled={busy || (phase === "betting" && bet <= 0)}
              className="w-full rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 py-3 font-bold text-bg-950 shadow-lg transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
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
          background:
            "radial-gradient(ellipse at 50% 0%, #0f3d2e 0%, #0a2b21 55%, #061a15 100%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.55)",
        }}
      >
        <div className="pointer-events-none absolute left-1/2 top-[38%] w-full max-w-md -translate-x-1/2 -translate-y-1/2 text-center opacity-25">
          <p className="text-lg font-black uppercase tracking-widest text-emerald-200 sm:text-2xl">
            Blackjack Pays 3 to 2
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80 sm:text-xs">
            Dealer stands on 17
          </p>
        </div>

        <div className="relative mb-10">
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

        <div className="relative">
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
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mt-8 text-center text-emerald-200/50">
            Place a bet and hit Deal to start.
          </motion.p>
        )}
      </div>
    </div>
  );
}
