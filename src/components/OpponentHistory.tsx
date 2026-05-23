import type { PlayerBaseline } from "../types";
import { fmtNum } from "../lib/format";

interface Props {
  player: PlayerBaseline | null;
  homeTeam: "NYK" | "CLE";
}

export function OpponentHistory({ player, homeTeam }: Props) {
  if (!player) return null;
  const opp = player.team === "NYK" ? "CLE" : "NYK";
  const hasOppHistory = player.vsOpponentN >= 2;
  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Real Splits — {player.name}
      </h2>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-terminal-bg/40 rounded p-2">
          <div className="text-[10px] text-terminal-dim uppercase tracking-wider">
            Vs {opp} (real history)
          </div>
          {hasOppHistory ? (
            <>
              <div className="text-sm font-semibold">
                {fmtNum(player.vsOpponentPPG, 1)} PPG{" "}
                <span className="text-terminal-dim text-[10px] font-normal">
                  ({player.vsOpponentN} games)
                </span>
              </div>
              <div className="text-[10px] text-terminal-dim">
                multiplier x{fmtNum(player.vsOpponentMult, 3)}
              </div>
            </>
          ) : (
            <div className="text-terminal-dim text-[11px]">
              Insufficient sample (n={player.vsOpponentN}) — model falls back
              to DvP prior
            </div>
          )}
        </div>
        <div className="bg-terminal-bg/40 rounded p-2">
          <div className="text-[10px] text-terminal-dim uppercase tracking-wider">
            Playoff (real)
          </div>
          <div className="text-sm font-semibold">
            {fmtNum(player.playoffPpg, 1)} PPG ·{" "}
            {fmtNum(player.playoffMin, 1)} MIN
          </div>
          <div className="text-[10px] text-terminal-dim">
            {player.playoffN} games · drives projected minutes
          </div>
        </div>
        <div className="bg-terminal-bg/40 rounded p-2">
          <div className="text-[10px] text-terminal-dim uppercase tracking-wider">
            Rest — 1-day (tonight)
          </div>
          <div className="text-sm font-semibold">
            x{fmtNum(player.rest1Mult, 3)}
          </div>
          <div className="text-[10px] text-terminal-dim">applied to projection</div>
        </div>
        <div className="bg-terminal-bg/40 rounded p-2">
          <div className="text-[10px] text-terminal-dim uppercase tracking-wider">
            Home / Away (real)
          </div>
          <div className="text-sm font-semibold">
            x{fmtNum(player.homeMult, 3)} / x{fmtNum(player.awayMult, 3)}
          </div>
          <div className="text-[10px] text-terminal-dim">
            {player.team === homeTeam ? "Home tonight" : "Road tonight"}
          </div>
        </div>
      </div>
    </section>
  );
}
