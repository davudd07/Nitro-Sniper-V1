import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sound } from "../lib/sound";

export function ComingSoon({ title = "Keno" }: { title?: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="-rotate-2 inline-block rounded-lg border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.24em] text-white">
        Coming Soon
      </p>
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        This table is on the way. The rest of Prism Vault is open — cases, battles, coin flip, and the other originals.
      </p>
      <Link
        to="/"
        onClick={() => sound.click()}
        className="btn-primary mt-8 inline-flex items-center gap-2 px-6 py-2.5"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lobby
      </Link>
    </div>
  );
}
