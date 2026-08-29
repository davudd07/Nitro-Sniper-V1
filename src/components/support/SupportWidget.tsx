import { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Minus, Send, X } from "lucide-react";
import { clsx } from "clsx";
import { ticketHasUnread, useSupportStore } from "../../store/supportStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { sound } from "../../lib/sound";

export function SupportWidget() {
  const chatOpen = useSettingsStore((s) => s.chatOpen);
  const tickets = useSupportStore((s) => s.tickets);
  const lastTicketId = useSupportStore((s) => s.lastTicketId);
  const seenAt = useSupportStore((s) => s.seenAt);
  const openTicket = useSupportStore((s) => s.openTicket);
  const reply = useSupportStore((s) => s.reply);
  const setLastTicketId = useSupportStore((s) => s.setLastTicketId);
  const markSeen = useSupportStore((s) => s.markSeen);
  const push = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const lastToastRef = useRef<string | null>(null);

  const mine = useMemo(
    () =>
      tickets
        .filter((t) => t.from === "You")
        .slice()
        .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)),
    [tickets],
  );
  const active = mine.find((t) => t.id === activeId) ?? null;
  const unreadCount = mine.filter((t) => ticketHasUnread(t, seenAt ?? {})).length;

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "prism-vault-support") {
        void useSupportStore.persist.rehydrate();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const newest = mine.find((t) => ticketHasUnread(t, seenAt ?? {}));
    if (!newest) return;
    const last = newest.messages[newest.messages.length - 1];
    if (!last || last.from !== "warden") return;
    if (lastToastRef.current === last.id) return;
    lastToastRef.current = last.id;
    if (!open || activeId !== newest.id) {
      push("Live support replied — open Support to continue the chat.", "info");
    }
  }, [mine, seenAt, open, activeId, push]);

  useEffect(() => {
    if (!open) return;
    const unread = mine.find((t) => ticketHasUnread(t, seenAt ?? {}));
    const next = unread?.id ?? lastTicketId ?? mine[0]?.id ?? null;
    if (next) {
      setActiveId(next);
      setComposing(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the panel opens

  useEffect(() => {
    if (!active) return;
    setLastTicketId(active.id);
    markSeen(active.id);
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.id, active?.messages.length, setLastTicketId, markSeen]);

  function submitNew() {
    const id = openTicket(subject, body);
    if (!id) return;
    sound.click();
    push("Ticket sent. We’ll reply in this same chat.", "success");
    setSubject("");
    setBody("");
    setActiveId(id);
    setComposing(false);
  }

  function sendReply() {
    if (!active || !replyText.trim()) return;
    reply(active.id, replyText, "user");
    setReplyText("");
    sound.click();
  }

  function openThread(id: string) {
    setActiveId(id);
    setComposing(false);
    markSeen(id);
  }

  const sidebar = chatOpen ? 300 : 48;
  const chatTab = 36;
  const gap = 16;

  return (
    <div
      className="pointer-events-none fixed bottom-4 z-[40] flex flex-col items-end gap-2"
      style={{ right: sidebar + chatTab + gap }}
    >
      {open && (
        <div className="pointer-events-auto flex h-[440px] w-[340px] max-w-[calc(100vw-7rem)] flex-col overflow-hidden rounded-xl border-2 border-cyan-400/35 bg-[#101818] shadow-[6px_6px_0_#050808]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#152020] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-bold uppercase tracking-wide text-white">Live support</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-3">
            {composing || (!active && mine.length === 0) ? (
              <div className="h-full overflow-y-auto">
                {mine.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setComposing(false)}
                    className="mb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
                  >
                    ← Back to tickets
                  </button>
                )}
                <p className="mb-2 text-xs text-slate-400">Ask a question. Replies land in this same thread.</p>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Battle seat stuck"
                  className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
                />
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Question</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="What do you need help with?"
                  className="mb-2 w-full resize-none rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
                />
                <button
                  type="button"
                  disabled={!body.trim()}
                  onClick={submitNew}
                  className="btn-primary w-full py-2 text-xs disabled:opacity-40"
                >
                  Send ticket
                </button>
              </div>
            ) : active ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(null);
                      setComposing(false);
                    }}
                    className="text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
                  >
                    ← All tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-white"
                  >
                    New
                  </button>
                </div>
                <p className="truncate text-sm font-semibold text-white">{active.subject}</p>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {active.status === "open" ? "Open chat" : "Closed — send a message to reopen"}
                </p>
                <div ref={threadRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {active.messages.map((m) => (
                    <div
                      key={m.id}
                      className={clsx(
                        "rounded-lg px-2.5 py-2 text-xs",
                        m.from === "user" ? "ml-6 bg-emerald-500/15 text-emerald-50" : "mr-6 bg-white/10 text-slate-200",
                      )}
                    >
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {m.from === "user" ? "You" : "Warden"} · {new Date(m.at).toLocaleTimeString()}
                      </p>
                      {m.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your tickets</p>
                  <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300"
                  >
                    New ticket
                  </button>
                </div>
                <ul className="space-y-1">
                  {mine.map((t) => {
                    const unread = ticketHasUnread(t, seenAt ?? {});
                    const last = t.messages[t.messages.length - 1];
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => openThread(t.id)}
                          className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-white/5"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-white">{t.subject}</span>
                            <span
                              className={clsx(
                                "shrink-0 text-[10px] font-bold uppercase",
                                unread ? "text-amber-300" : t.status === "open" ? "text-emerald-300" : "text-slate-500",
                              )}
                            >
                              {unread ? "Reply" : t.status}
                            </span>
                          </span>
                          {last && (
                            <span className="truncate text-[11px] text-slate-500">
                              {last.from === "warden" ? "Warden: " : "You: "}
                              {last.text}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {active && !composing && (
            <form
              className="flex gap-2 border-t border-white/10 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
            >
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={active.status === "open" ? "Write a reply…" : "Write to reopen this ticket…"}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="grid h-9 w-9 place-items-center rounded-md bg-cyan-400 text-bg-950 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          sound.click();
          setOpen((v) => !v);
        }}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-cyan-400/50 bg-[#152020] px-3 py-2.5 text-sm font-bold text-cyan-100 shadow-[4px_4px_0_#050808] hover:bg-cyan-400/15"
        title="Live support"
      >
        {open ? <X className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        {open ? "Close" : "Support"}
        {!open && unreadCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1 text-[10px] font-black text-bg-950">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
