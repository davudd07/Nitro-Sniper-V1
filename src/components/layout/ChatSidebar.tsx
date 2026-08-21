import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import { clsx } from "clsx";
import { useSettingsStore } from "../../store/settingsStore";
import { useChatStore } from "../../store/chatStore";
import { ChatRainBanner } from "../chat/ChatRainBanner";
import { ChatModMenu } from "../admin/ChatModMenu";
import { PlayerTipButton } from "../chat/PlayerTipButton";
import { useAdminViewStore } from "../../store/adminViewStore";
import { sound } from "../../lib/sound";

const TAB_BTN =
  "absolute right-full z-50 grid h-9 w-9 place-items-center rounded-r-none rounded-md border-2 border-r-0 border-[#3d5a3a] bg-[#152018] text-emerald-200 shadow-[2px_2px_0_#050805]";

export function ChatSidebar() {
  const open = useSettingsStore((s) => s.chatOpen);
  const toggle = useSettingsStore((s) => s.toggleChat);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const adminView = useAdminViewStore((s) => s.active);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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
          <ChatRainBanner />
          <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3 scrollbar-thin">
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
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold" style={{ color: m.color }}>
                    {m.name}
                  </p>
                  <span className="flex items-center gap-0.5">
                    {!m.rain && !m.you && !m.tip && <PlayerTipButton name={m.name} />}
                    {adminView && !m.rain && <ChatModMenu name={m.name} />}
                  </span>
                </div>
                <p className="text-[12px] leading-snug text-slate-200">{m.text}</p>
              </div>
            ))}
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
