import type { BestBet, Provenance } from "../types";
import { fmtAmerican, fmtNum, fmtPct } from "../lib/format";
import { displaySelection } from "../lib/display";

interface Props {
  bets: BestBet[];
  oddsProvenance: Provenance;
  bankroll: number;
}

export function BestBetsTable({ bets, oddsProvenance, bankroll }: Props) {
  const positive = bets.filter((b) => b.edgePct > 0);
  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
          Best Bets — Ranked by EV
        </h2>
        <div className="text-[11px] text-terminal-dim flex items-center gap-2">
          <span
            className={`chip ${
              oddsProvenance === "LIVE"
                ? "bg-terminal-accent/15 text-terminal-accent"
                : "bg-terminal-warn/15 text-terminal-warn"
            }`}
          >
            {oddsProvenance} odds
          </span>
          {positive.length} positive-EV plays
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="terminal">
          <thead>
            <tr>
              <th>Market</th>
              <th>Selection</th>
              <th>Price</th>
              <th>Book P</th>
              <th>De-vig P</th>
              <th>Model P</th>
              <th>Edge</th>
              <th>EV / 1U</th>
              <th>Kelly Stake</th>
              <th>Conf</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((b, i) => {
              const edgeCls =
                b.edgePct > 0 ? "cell-edge-pos" : "cell-edge-neg";
              const stake = Math.round(b.kellyFraction * bankroll * 100) / 100;
              return (
                <tr key={i}>
                  <td className="text-terminal-dim uppercase">{b.market}</td>
                  <td className="font-semibold">{displaySelection(b.selection)}</td>
                  <td>{fmtAmerican(b.bookPrice)}</td>
                  <td>{fmtPct(b.bookImpliedProb)}</td>
                  <td>{fmtPct(b.devigProb)}</td>
                  <td>{fmtPct(b.modelProb)}</td>
                  <td className={edgeCls}>
                    {b.edgePct >= 0 ? "+" : ""}
                    {fmtPct(b.edgePct)}
                  </td>
                  <td className={edgeCls}>
                    {b.evPer1U >= 0 ? "+" : ""}
                    {fmtNum(b.evPer1U, 3)}
                  </td>
                  <td>
                    {b.kellyFraction > 0 ? (
                      <span>
                        {fmtPct(b.kellyFraction, 2)}{" "}
                        <span className="text-terminal-dim">
                          (${stake.toLocaleString()})
                        </span>
                      </span>
                    ) : (
                      <span className="text-terminal-dim">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`chip ${
                        b.confidence === "HIGH"
                          ? "bg-terminal-accent/15 text-terminal-accent"
                          : b.confidence === "MED"
                          ? "bg-terminal-info/15 text-terminal-info"
                          : "bg-terminal-border text-terminal-dim"
                      }`}
                    >
                      {b.confidence}
                    </span>
                  </td>
                  <td className="text-[10px] text-terminal-dim max-w-md">
                    {b.rationale}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
