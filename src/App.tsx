import { useEffect } from "react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import { clsx } from "clsx";
import { NavBar } from "./components/layout/NavBar";
import { DemoBanner } from "./components/layout/DemoBanner";
import { GameSidebar } from "./components/layout/GameSidebar";
import { ChatSidebar } from "./components/layout/ChatSidebar";
import { Toasts } from "./components/ui/Toasts";
import { useEconomyStore } from "./store/economyStore";
import { useToastStore } from "./store/toastStore";
import { Home } from "./pages/Home";
import { Mines } from "./pages/Mines";
import { Blackjack } from "./pages/Blackjack";
import { Cases } from "./pages/Cases";
import { CaseOpenPage } from "./pages/CaseOpenPage";
import { CaseBattlesLobby } from "./pages/CaseBattlesLobby";
import { CreateBattle } from "./pages/CreateBattle";
import { BattleRoom } from "./pages/BattleRoom";
import { JackpotPage } from "./pages/Jackpot";
import { CoinFlip } from "./pages/CoinFlip";
import { ComingSoon } from "./pages/ComingSoon";
import { ChatRainController } from "./components/chat/ChatRainController";
import { PATH_TO_GAME } from "./data/lobbyGames";
import { trackRecent } from "./lib/recentGames";
import { Rewards } from "./pages/Rewards";

// Forces a full remount of the battle room whenever the battle id changes,
// so state from a previous battle (refs, timers, phase) never leaks in.
function BattleRoomRoute() {
  const { battleId } = useParams();
  return <BattleRoom key={battleId} />;
}

export default function App() {
  const balance = useEconomyStore((s) => s.balance);
  const maybeTopUp = useEconomyStore((s) => s.maybeTopUp);
  const push = useToastStore((s) => s.push);
  const location = useLocation();
  const isBattleRoom = /^\/battles\/(?!create$)[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (maybeTopUp()) {
      push("Balance was running low — 10,000 demo Shards added automatically.", "success");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/battles")) trackRecent("battles");
    else if (path.startsWith("/cases")) trackRecent("cases");
    else {
      const id = PATH_TO_GAME[path];
      if (id) trackRecent(id);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <GameSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <NavBar wide={isBattleRoom} />
        <DemoBanner />
        <main
          className={clsx(
            "mx-auto w-full min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-6 sm:px-4",
            isBattleRoom ? "max-w-none" : "max-w-7xl",
          )}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/mines" element={<Mines />} />
            <Route path="/blackjack" element={<Blackjack />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:caseId" element={<CaseOpenPage />} />
            <Route path="/battles" element={<CaseBattlesLobby />} />
            <Route path="/battles/create" element={<CreateBattle />} />
            <Route path="/battles/:battleId" element={<BattleRoomRoute />} />
            <Route path="/jackpot" element={<JackpotPage />} />
            <Route path="/coinflip" element={<CoinFlip />} />
            <Route path="/keno" element={<ComingSoon title="Keno" />} />
          </Routes>
        </main>
        <footer className="shrink-0 border-t border-white/[0.05] py-5 text-center text-xs text-slate-500">
          Prism Vault is a portfolio demo. Play-money only — no purchases, deposits, or withdrawals exist anywhere in this app.
        </footer>
      </div>
      <ChatSidebar />
      <ChatRainController />
      <Toasts />
    </div>
  );
}
