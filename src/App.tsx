import { useEffect } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { NavBar } from "./components/layout/NavBar";
import { DemoBanner } from "./components/layout/DemoBanner";
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

  useEffect(() => {
    if (maybeTopUp()) {
      push("Balance was running low — 10,000 demo Shards added automatically.", "success");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <DemoBanner />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mines" element={<Mines />} />
          <Route path="/blackjack" element={<Blackjack />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:caseId" element={<CaseOpenPage />} />
          <Route path="/battles" element={<CaseBattlesLobby />} />
          <Route path="/battles/create" element={<CreateBattle />} />
          <Route path="/battles/:battleId" element={<BattleRoomRoute />} />
        </Routes>
      </main>
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-600">
        Prism Vault is a portfolio demo. Play-money only — no purchases, deposits, or withdrawals exist anywhere in this app.
      </footer>
      <Toasts />
    </div>
  );
}
