import { clsx } from "clsx";
import { useToastStore } from "../../store/toastStore";
import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
const STYLES = {
  info: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-100",
};

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className={clsx(
              "float-in pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur",
              STYLES[t.tone],
            )}
            onClick={() => dismiss(t.id)}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-snug">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
