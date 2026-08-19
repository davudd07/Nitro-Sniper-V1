import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { freshDeck, shuffleDeck, handTotal, isBlackjack, type Card } from "../lib/blackjack";
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
    if (!spend(bet)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    setBusy(true);
    setDoubled(false);
    setOutcome(null);
    setMessage("");
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

    if (isBlackjack(p)) {
      await sleep(500);
      await resolveRound(p, dl, d, true);
    }
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
                Single 52-card shoe reshuffled every hand, ordering derived from the provably-fair seed below. No
                insurance or side bets — the house edge comes purely from standard blackjack rules.
              </p>
            </InfoButton>
          </div>
          <label className="mb-1 block text-xs text-slate-400">Bet amount</label>
          <div className="mb-4 flex items-center gap-2">
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
              onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
              className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              disabled={phase !== "betting"}
              onClick={() => setBet((b) => b * 2)}
              className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {phase === "betting" || phase === "settled" ? (
            <button
              onClick={phase === "settled" ? newRound : deal}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 py-3 font-bold text-bg-950 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {phase === "settled" ? "New Round" : "Deal"}
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={hit}
                disabled={busy || phase !== "player-turn"}
                className="rounded-xl bg-emerald-500 py-2.5 font-semibold text-bg-950 disabled:opacity-40"
              >
                Hit
              </button>
              <button
                onClick={stand}
                disabled={busy || phase !== "player-turn"}
                className="rounded-xl bg-sky-500 py-2.5 font-semibold text-bg-950 disabled:opacity-40"
              >
                Stand
              </button>
              <button
                onClick={double}
                disabled={busy || phase !== "player-turn" || player.length !== 2}
                className="rounded-xl bg-amber-500 py-2.5 font-semibold text-bg-950 disabled:opacity-40"
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
        </div>
        <ProvablyFairPanel />
      </div>

      <div className="rounded-2xl border border-white/10 bg-bg-800/40 p-4 sm:p-8">
        <div className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
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

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
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
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center text-slate-500">
            Place a bet and hit Deal to start.
          </motion.p>
        )}
      </div>
    </div>
  );
}
