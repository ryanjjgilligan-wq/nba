import type { GameContext, Provenance } from "../types";

interface Props {
  game: GameContext;
  provenance: Provenance;
  source: string;
}

export function Header({ game, provenance, source }: Props) {
  const tipoff = new Date(game.tipoffISO);
  const tipText = tipoff.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <header className="panel px-4 py-3 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs text-terminal-dim uppercase tracking-widest">
          Game 3 Oracle
          <span className="chip bg-terminal-info/10 text-terminal-info">
            single-game engine
          </span>
        </div>
        <div className="mt-1 text-xl font-bold flex items-center gap-3">
          <span className="text-terminal-nyk">NYK</span>
          <span className="text-terminal-dim">@</span>
          <span className="text-terminal-cle">CLE</span>
          <span className="text-terminal-dim text-sm font-normal">
            · {game.seriesText}
          </span>
        </div>
        <div className="text-xs text-terminal-dim mt-1">
          {tipText} · {game.venue}
        </div>
      </div>
      <div className="text-right text-[10px] text-terminal-dim">
        <div>
          <span
            className={`chip ${
              provenance === "LIVE"
                ? "bg-terminal-accent/15 text-terminal-accent"
                : "bg-terminal-warn/15 text-terminal-warn"
            }`}
          >
            {provenance}
          </span>
        </div>
        <div className="mt-1">{source}</div>
      </div>
    </header>
  );
}
