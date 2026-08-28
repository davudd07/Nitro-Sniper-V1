import { useEffect } from "react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import { clsx } from "clsx";
import { NavBar } from "./components/layout/NavBar";
import { WinLeaderStrip } from "./components/layout/WinLeaderStrip";
import { BanNotice } from "./components/layout/BanNotice";
import { GameSidebar } from "./components/layout/GameSidebar";
import { ChatSidebar } from "./components/layout/ChatSidebar";
import { Toasts } from "./components/ui/Toasts";
import { useEconomyStore } from "./store/economyStore";
import { useSettingsStore } from "./store/settingsStore";
import { useToastStore } from "./store/toastStore";
import { Home } from "./pages/Home";
import { Mines } from "./pages/Mines";
import { Blackjack } from "./pages/Blackjack";
import { Cases } from "./pages/Cases";
import { CaseOpenPage } from "./pages/CaseOpenPage";
import { CreateCommunityCasePage } from "./pages/CreateCommunityCase";
import { CaseBattlesLobby } from "./pages/CaseBattlesLobby";
import { CreateBattle } from "./pages/CreateBattle";
import { BattleRoom } from "./pages/BattleRoom";
import { JackpotPage } from "./pages/Jackpot";
import { CoinFlip } from "./pages/CoinFlip";
import { Upgrader } from "./pages/Upgrader";
import { Dice } from "./pages/Dice";
import { Crash } from "./pages/Crash";
import { CrossRoad } from "./pages/CrossRoad";
import { Keno } from "./pages/Keno";
import { LockFruit } from "./pages/LockFruit";
import { GemRush } from "./pages/GemRush";
import { ChatRainController } from "./components/chat/ChatRainController";
import { VaultEventsController } from "./components/layout/VaultEventsController";
import { SupportWidget } from "./components/support/SupportWidget";
import { PATH_TO_GAME } from "./data/lobbyGames";
import { trackRecent } from "./lib/recentGames";
import { Rewards } from "./pages/Rewards";
import { Vip } from "./pages/Vip";
import { Affiliate } from "./pages/Affiliate";
import { Leaderboard } from "./pages/Leaderboard";
import { Admin } from "./pages/Admin";
import { AdminViewBar } from "./components/admin/AdminViewBar";
import { installChatModeration } from "./lib/moderation";
import { AccountGate } from "./components/auth/AccountGate";
import { MaxxxWinOverlay } from "./components/cases/MaxxxWinOverlay";
import { LiveBetStrip } from "./components/layout/LiveBetStrip";
import { useAffiliateStore } from "./store/affiliateStore";

// Forces a full remount of the battle room whenever the battle id changes,
// so state from a previous battle (refs, timers, phase) never leaks in.
function BattleRoomRoute() {
  const { battleId } = useParams();
  return <BattleRoom key={battleId} />;
}

export default function App() {
  const balance = useEconomyStore((s) => s.balance);
  const maybeTopUp = useEconomyStore((s) => s.maybeTopUp);
  const lockUnit = useSettingsStore((s) => s.lockUnit);
  const push = useToastStore((s) => s.push);
  const location = useLocation();
  void lockUnit;
  const isBattleRoom = /^\/battles\/(?!create$)[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (maybeTopUp()) {
      push("Balance was running low — 10,000 demo World Locks added automatically.", "success");
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const apply = () => useAffiliateStore.getState().captureRef(ref);
    if (useAffiliateStore.persist.hasHydrated()) apply();
    return useAffiliateStore.persist.onFinishHydration(() => {
      apply();
    });
  }, [location.search]);

  useEffect(() => {
    installChatModeration();
  }, []);

  const isAdmin = location.pathname === "/admin";
  if (isAdmin) {
    return (
      <div className="flex h-full min-h-0 overflow-hidden">
        <Admin />
        <Toasts />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <GameSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <NavBar wide={isBattleRoom} />
        <AdminViewBar />
        <WinLeaderStrip />
        <BanNotice />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div
            className={clsx(
              "mx-auto w-full min-h-full px-3 py-6 sm:px-4",
              isBattleRoom ? "max-w-none" : "max-w-7xl",
            )}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/vip" element={<Vip />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/mines" element={<Mines />} />
              <Route path="/blackjack" element={<Blackjack />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/create" element={<CreateCommunityCasePage />} />
              <Route path="/cases/:caseId" element={<CaseOpenPage />} />
              <Route path="/battles" element={<CaseBattlesLobby />} />
              <Route path="/battles/create" element={<CreateBattle />} />
              <Route path="/battles/:battleId" element={<BattleRoomRoute />} />
              <Route path="/jackpot" element={<JackpotPage />} />
              <Route path="/coinflip" element={<CoinFlip />} />
              <Route path="/upgrader" element={<Upgrader />} />
              <Route path="/dice" element={<Dice />} />
              <Route path="/crash" element={<Crash />} />
              <Route path="/road" element={<CrossRoad />} />
              <Route path="/keno" element={<Keno />} />
              <Route path="/lockfruit" element={<LockFruit />} />
              <Route path="/gemrush" element={<GemRush />} />
            </Routes>
          </div>
          <LiveBetStrip />
        </main>
      </div>
      <ChatSidebar />
      <ChatRainController />
      <VaultEventsController />
      <SupportWidget />
      <AccountGate />
      <MaxxxWinOverlay />
      <Toasts />
    </div>
  );
}
