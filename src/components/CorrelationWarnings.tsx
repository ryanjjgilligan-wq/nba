import { useMemo } from "react";
import type { BestBet, PlayerBaseline, TeamCode } from "../types";
import { aggregateExposure, findCorrelations } from "../models/correlation";
import { displaySelection } from "../lib/display";
import { fmtPct } from "../lib/format";

interface Props {
  bets: BestBet[];
  players: PlayerBaseline[];
  homeTeam: TeamCode;
  topNBets?: number; // only analyze the top N positive-EV bets
}

export function CorrelationWarnings({ bets, players, homeTeam, topNBets = 10 }: Props) {
  const playerToTeam = useMemo(() => {
    const m = new Map<string, "home" | "away">();
    for (const p of players) {
      m.set(p.name, p.team === homeTeam ? "home" : "away");
    }
    return m;
  }, [players, homeTeam]);

  const positive = useMemo(
    () => bets.filter((b) => b.edgePct > 0 && b.kellyFraction > 0).slice(0, topNBets),
    [bets, topNBets],
  );

  const correlations = useMemo(
    () => findCorrelations(positive, playerToTeam),
    [positive, playerToTeam],
  );

  const exposure = useMemo(() => aggregateExposure(positive), [positive]);
  const maxSideExposure = Math.max(exposure.homeSide, exposure.awaySide, exposure.over, exposure.under);
  const overexposed = maxSideExposure > 0.5; // > 50% of bankroll on one direction

  if (correlations.length === 0 && !overexposed) {
    return (
      <section className="panel p-4 text-xs text-terminal-dim">
        <div className="text-sm uppercase tracking-widest text-terminal-dim mb-2">Correlation Check</div>
        No correlated stacks detected in your top {topNBets} positive-EV bets.
      </section>
    );
  }

  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Correlation Warnings
      </h2>
      <div className="text-[11px] text-terminal-dim mb-3 leading-relaxed">
        Bets that win/lose together. Sizing them all at full Kelly = effectively
        a single larger bet. Stacking three positively-correlated picks at 1/4
        Kelly is roughly equivalent to one bet at 1/2 Kelly. <span className="text-terminal-warn">Most bankroll blowups come from stacked correlated bets, not single losses.</span>
      </div>

      {overexposed && (
        <div className="mb-3 p-2 border border-terminal-danger/40 rounded bg-terminal-danger/10 text-xs">
          <span className="font-semibold text-terminal-danger">⚠ Concentration risk:</span>{" "}
          You have <span className="font-semibold">{fmtPct(maxSideExposure, 1)}</span> of your bankroll in fractional-Kelly stake on a single directional outcome
          {exposure.homeSide === maxSideExposure ? " (home team)" :
           exposure.awaySide === maxSideExposure ? " (away team)" :
           exposure.over === maxSideExposure ? " (OVER)" : " (UNDER)"}.
          That's effectively one large bet, not a diversified portfolio.
        </div>
      )}

      {correlations.length > 0 && (
        <table className="terminal text-xs">
          <thead>
            <tr>
              <th>Bet A</th>
              <th>Bet B</th>
              <th>Corr</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {correlations.slice(0, 12).map((c, i) => (
              <tr key={i}>
                <td className="font-semibold">{displaySelection(c.betA.selection)}</td>
                <td className="font-semibold">{displaySelection(c.betB.selection)}</td>
                <td className={c.correlation >= 0 ? "text-terminal-warn" : "text-terminal-info"}>
                  {c.correlation >= 0 ? "+" : ""}{c.correlation.toFixed(2)}
                </td>
                <td className="text-[10px] text-terminal-dim">{c.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3 text-[10px] text-terminal-dim leading-relaxed">
        Rule of thumb: if you're betting two picks with corr ≥ 0.5, halve the
        smaller bet's Kelly stake. Don't both-sides any market (corr = -1)
        unless deliberately arbing across different sportsbooks.
      </div>
    </section>
  );
}
