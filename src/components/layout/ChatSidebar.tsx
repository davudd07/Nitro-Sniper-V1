import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import { clsx } from "clsx";
import { useSettingsStore } from "../../store/settingsStore";
import {
  useChatStore,
  CHAT_RAIN_JOIN_MS,
  CHAT_RAIN_PRIZE,
  CHAT_RAIN_WINNERS,
} from "../../store/chatStore";
import { sound } from "../../lib/sound";

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const TAB_BTN =
  "absolute right-full z-50 grid h-9 w-9 place-items-center rounded-r-none rounded-md border-2 border-r-0 border-[#3d5a3a] bg-[#152018] text-emerald-200 shadow-[2px_2px_0_#050805]";

export function ChatSidebar() {
  const open = useSettingsStore((s) => s.chatOpen);
  const toggle = useSettingsStore((s) => s.toggleChat);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const nextRainAt = useChatStore((s) => s.nextRainAt);
  const joinedRain = useChatStore((s) => s.joinedRain);
  const joinRain = useChatStore((s) => s.joinRain);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, open]);

  function submit() {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
    sound.click();
  }

  const remain = nextRainAt - now;
  const joinOpen = remain > 0 && remain <= CHAT_RAIN_JOIN_MS;
  const joined = joinedRain ?? [];
  const youJoined = joined.includes("You");

  return (
    <aside
      className={clsx(
        "relative z-50 flex h-full min-h-0 shrink-0 flex-col overflow-visible border-l-2 border-[#2a3a28] bg-[#0c1410] transition-[width] duration-200 ease-out",
        open ? "w-[300px]" : "w-12",
      )}
    >
      <button
        type="button"
        onClick={() => {
          sound.click();
          toggle();
        }}
        className={clsx(TAB_BTN, "top-4")}
        title={open ? "Collapse chat" : "Open chat"}
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={() => {
          sound.click();
          toggle();
        }}
        className={clsx(
          "absolute right-full bottom-4 z-50 grid h-9 w-9 place-items-center rounded-r-none rounded-md border-2 border-r-0 text-emerald-200 shadow-[2px_2px_0_#050805]",
          open ? "border-emerald-400/50 bg-emerald-400/15" : "border-[#3d5a3a] bg-[#152018]",
        )}
        title={open ? "Hide chat" : "Show chat"}
      >
        <MessageSquare className="h-4 w-4" />
      </button>

      <div className={clsx("flex shrink-0 items-center gap-2 border-b border-white/8 px-3 py-4", !open && "justify-center px-1")}>
        <MessageSquare className="h-4 w-4 shrink-0 text-emerald-300" />
        {open && <p className="pixel-label text-[15px] font-extrabold uppercase text-emerald-200/80">Chat</p>}
      </div>

      {open ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col px-3">
            <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto py-3 scrollbar-thin">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={clsx(
                    "rounded-md border px-2.5 py-1.5",
                    m.rain
                      ? "border-amber-400/40 bg-amber-400/10"
                      : m.you
                        ? "border-fuchsia-400/30 bg-black/25"
                        : "border-white/8 bg-black/25",
                  )}
                >
                  <p className="text-[11px] font-bold" style={{ color: m.color }}>
                    {m.name}
                  </p>
                  <p className="text-[12px] leading-snug text-slate-200">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="shrink-0 pb-2">
              <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5">
                <p className="text-[11px] font-bold text-amber-200">Chat rain</p>
                {joinOpen ? (
                  <p className="flex items-center justify-between gap-2 text-[12px] leading-snug text-slate-200">
                    <span>
                      {joined.length} joined · {formatRemain(remain)}
                    </span>
                    <button
                      type="button"
                      disabled={youJoined}
                      onClick={() => {
                        if (joinRain()) sound.click();
                      }}
                      className="shrink-0 rounded border border-amber-300/50 bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-100 disabled:opacity-50"
                    >
                      {youJoined ? "Joined" : "Join"}
                    </button>
                  </p>
                ) : (
                  <p className="text-[12px] leading-snug text-slate-200">
                    {formatRemain(remain)} · join closed · {CHAT_RAIN_WINNERS}×{CHAT_RAIN_PRIZE} SH
                  </p>
                )}
              </div>
            </div>
          </div>
          <form
            className="flex shrink-0 gap-1.5 border-t border-white/8 bg-[#0c1410] p-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              maxLength={200}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
            />
            <button type="submit" className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500 text-bg-950">
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </>
      ) : (
        <div className="flex flex-1 items-start justify-center pt-2">
          <span className="rotate-90 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Chat</span>
        </div>
      )}
    </aside>
  );
}
