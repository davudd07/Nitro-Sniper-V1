import { useMemo, useState } from "react";
import { Headphones, Minus, Send, X } from "lucide-react";
import { clsx } from "clsx";
import { useSupportStore } from "../../store/supportStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { sound } from "../../lib/sound";

export function SupportWidget() {
  const chatOpen = useSettingsStore((s) => s.chatOpen);
  const tickets = useSupportStore((s) => s.tickets);
  const openTicket = useSupportStore((s) => s.openTicket);
  const reply = useSupportStore((s) => s.reply);
  const push = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const mine = useMemo(() => tickets.filter((t) => t.from === "You"), [tickets]);
  const active = mine.find((t) => t.id === activeId) ?? null;
  const unreadWarden = mine.some((t) => {
    const last = t.messages[t.messages.length - 1];
    return last?.from === "warden" && t.status === "open";
  });

  function submitNew() {
    const id = openTicket(subject, body);
    if (!id) return;
    sound.click();
    push("Ticket sent to live support.", "success");
    setSubject("");
    setBody("");
    setActiveId(id);
  }

  function sendReply() {
    if (!active) return;
    reply(active.id, replyText, "user");
    setReplyText("");
    sound.click();
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 z-[45] flex flex-col items-end gap-2"
      style={{ right: chatOpen ? 316 : 64 }}
    >
      {open && (
        <div className="pointer-events-auto flex h-[420px] w-[340px] max-w-[calc(100vw-5rem)] flex-col overflow-hidden rounded-xl border-2 border-[#3d5a3a]/70 bg-[#101810] shadow-[6px_6px_0_#050805]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#152018] px-3 py-2.5">
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

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {active ? (
              <div className="flex h-full min-h-0 flex-col">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="mb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
                >
                  ← All tickets
                </button>
                <p className="mb-1 text-sm font-semibold text-white">{active.subject}</p>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {active.status === "open" ? "Open" : "Closed"}
                </p>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {active.messages.map((m) => (
                    <div
                      key={m.id}
                      className={clsx(
                        "rounded-lg px-2.5 py-2 text-xs",
                        m.from === "user" ? "ml-6 bg-emerald-500/15 text-emerald-50" : "mr-6 bg-white/8 text-slate-200",
                      )}
                    >
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {m.from === "user" ? "You" : "Warden"}
                      </p>
                      {m.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-400">Open a ticket. Wardens reply from the admin desk.</p>
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
                  rows={4}
                  placeholder="What do you need help with?"
                  className="mb-2 w-full resize-none rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
                />
                <button
                  type="button"
                  disabled={!body.trim()}
                  onClick={submitNew}
                  className="btn-primary mb-4 w-full py-2 text-xs disabled:opacity-40"
                >
                  Send ticket
                </button>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Your tickets</p>
                {mine.length === 0 ? (
                  <p className="text-xs text-slate-600">None yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {mine.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => setActiveId(t.id)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/5"
                        >
                          <span className="truncate font-semibold text-white">{t.subject}</span>
                          <span
                            className={clsx(
                              "ml-2 shrink-0 text-[10px] font-bold uppercase",
                              t.status === "open" ? "text-emerald-300" : "text-slate-500",
                            )}
                          >
                            {t.status}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {active && active.status === "open" && (
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
                placeholder="Add a reply…"
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500 text-bg-950 disabled:opacity-40"
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
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-emerald-400/50 bg-[#152018] px-3 py-2.5 text-sm font-bold text-emerald-100 shadow-[4px_4px_0_#050805] hover:bg-emerald-400/15"
        title="Live support"
      >
        {open ? <X className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        {open ? "Close" : "Support"}
        {!open && unreadWarden && (
          <span className="h-2 w-2 rounded-full bg-amber-300" />
        )}
      </button>
    </div>
  );
}
