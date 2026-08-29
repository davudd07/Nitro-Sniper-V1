import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, X } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../../store/economyStore";
import { useToastStore } from "../../store/toastStore";
import { CashAmount } from "../ui/CurrencyIcon";
import { LockAmountInput } from "../ui/LockAmountInput";
import { sound } from "../../lib/sound";

type Tab = "deposit" | "withdraw";
type Method = "crypto" | "card";

const PRESETS = [50, 100, 250, 500, 1000, 5000];

const METHODS: { id: Method; label: string; blurb: string }[] = [
  { id: "crypto", label: "Crypto", blurb: "BTC · ETH · LTC" },
  { id: "card", label: "Card", blurb: "Visa · Mastercard" },
];

export function WalletMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("deposit");
  const [method, setMethod] = useState<Method>("crypto");
  const [amount, setAmount] = useState(100);
  const balance = useEconomyStore((s) => s.balance);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function submit() {
    sound.click();
    push(tab === "deposit" ? "Deposits aren't live yet." : "Withdrawals aren't live yet.", "info");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          sound.click();
          setOpen(true);
        }}
        className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-md border-2 border-emerald-200/80 bg-emerald-500 text-white shadow-[3px_3px_0_#050808] transition-[filter,transform] hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0"
        title="Wallet"
        aria-label="Open wallet"
      >
        <Wallet className="h-5 w-5" strokeWidth={2.4} />
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="surface w-full max-w-md p-5"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="wallet-title"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500 text-white">
                      <Wallet className="h-4 w-4" strokeWidth={2.4} />
                    </span>
                    <div>
                      <h2 id="wallet-title" className="text-lg font-semibold text-white">
                        Wallet
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label="Close wallet"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 rounded-lg bg-black/35 px-3 py-2.5 ring-1 ring-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Available</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    <CashAmount wl={balance} currency="wl" iconClassName="h-5 w-5" />
                  </p>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-1">
                  {(
                    [
                      { id: "deposit", label: "Deposit", icon: ArrowDownToLine },
                      { id: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setTab(t.id);
                      }}
                      className={clsx(
                        "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-extrabold uppercase tracking-wide",
                        tab === t.id ? "bg-emerald-500/20 text-emerald-100" : "text-slate-400 hover:text-white",
                      )}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>

                <label className="mb-3 block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Amount
                  </span>
                  <div className="flex items-center gap-2">
                    <LockAmountInput
                      valueWl={amount}
                      onChangeWl={(wl) => setAmount(Math.max(0, wl))}
                      currency="wl"
                      className="min-w-0 flex-1"
                      inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/40"
                    />
                    {tab === "withdraw" ? (
                      <button
                        type="button"
                        onClick={() => {
                          sound.click();
                          setAmount(balance);
                        }}
                        className="rounded-lg px-2.5 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-100 ring-1 ring-amber-300/35 hover:bg-amber-400/10"
                      >
                        Max
                      </button>
                    ) : null}
                  </div>
                </label>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setAmount(v);
                      }}
                      className={clsx(
                        "flex-1 rounded-md py-1.5 text-[11px] font-semibold ring-1 transition-colors",
                        amount === v
                          ? "bg-emerald-400/15 text-emerald-100 ring-emerald-400/40"
                          : "bg-bg-900 text-slate-300 ring-white/10 hover:bg-bg-700",
                      )}
                    >
                      <CashAmount wl={v} currency="wl" iconClassName="h-3 w-3" />
                    </button>
                  ))}
                </div>

                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">Method</p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setMethod(m.id);
                      }}
                      className={clsx(
                        "rounded-lg px-3 py-2.5 text-left ring-1 transition-colors",
                        method === m.id
                          ? "bg-emerald-400/10 ring-emerald-400/40"
                          : "bg-bg-900 ring-white/10 hover:bg-bg-700",
                      )}
                    >
                      <span className="block text-sm font-semibold text-white">{m.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">{m.blurb}</span>
                    </button>
                  ))}
                </div>

                <button type="button" onClick={submit} className="btn-cyan w-full py-3 text-sm">
                  {tab === "deposit" ? "Deposit" : "Withdraw"} ·{" "}
                  <CashAmount wl={amount} currency="wl" iconClassName="h-4 w-4" />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
