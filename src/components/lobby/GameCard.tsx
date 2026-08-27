import { Link } from "react-router-dom";
import { clsx } from "clsx";
import type { LobbyGame } from "../../data/lobbyGames";

export function GameCard({
  game,
  onSoon,
  featured = false,
}: {
  game: LobbyGame;
  onSoon?: () => void;
  featured?: boolean;
}) {
  const painted = Boolean(game.painted);

  const body = (
    <>
      <img
        src={game.image}
        alt={game.name}
        draggable={false}
        className={clsx(
          "h-full w-full",
          painted ? "object-contain" : "object-cover transition-transform duration-300 group-hover:scale-105",
        )}
      />
      {!painted && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3 pt-10">
          <p className="text-[15px] font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow">{game.name}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">{game.subtitle}</p>
        </div>
      )}
      {game.isNew && !painted && (
        <span className="absolute left-2 top-2 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
          New
        </span>
      )}
      {game.comingSoon && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-black/55 backdrop-blur-[2px]">
          <span className="-rotate-6 rounded-md border border-white/25 bg-black/75 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white shadow-lg">
            Coming Soon
          </span>
        </div>
      )}
    </>
  );

  const className = clsx(
    "lobby-tile-lift group relative block",
    painted
      ? clsx("aspect-[6/5]", featured ? "w-full" : "w-[200px] shrink-0 sm:w-[228px]")
      : "aspect-[3/4] w-[158px] shrink-0 overflow-hidden rounded-xl border-2 border-white/10 shadow-[4px_4px_0_#050808] sm:w-[176px]",
  );

  if (game.comingSoon || !game.to) {
    return (
      <button type="button" onClick={onSoon} className={className} aria-label={`${game.name} (coming soon)`}>
        {body}
      </button>
    );
  }

  return (
    <Link to={game.to} className={className} aria-label={game.name}>
      {body}
    </Link>
  );
}
