import { useEffect, useMemo, useState } from "react";
import type { BettingLine } from "../types";
import {
  type PlacedBet,
  computeClv,
  getPlacedBets,
  removeBet,
} from "../lib/placedBets";
import { displaySelection } from "../lib/display";
import { fmtAmerican, fmtPct } from "../lib/format";

interface Props {
  currentLines: BettingLine[];
}

export function ClvTracker({ currentLines }: Props) {
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [version, setVersion] = useState(0); // bump to force reload after track/remove

  useEffect(() => {
    setBets(getPlacedBets());
  }, [version]);

  // Reload on placedBets storage events (cross-tab)
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener("storage", handler);
    // Also poll once a second in case same-tab adds aren't broadcast
    const t = setInterval(() => {
      const fresh = getPlacedBets();
      if (fresh.length !== bets.length) setBets(fresh);
    }, 1500);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(t);
    };
  }, [bets.length]);

  const clvByBet = useMemo(() => {
    return bets.map((b) => {
      const currentLine = currentLines.find((l) => l.selection === b.selection);
      return computeClv(b, currentLine?.price ?? null);
    });
  }, [bets, currentLines]);

  // Aggregate CLV stats (running track record)
  const summary = useMemo(() => {
    const withClv = clvByBet.filter((c) => c.clvPct != null);
    if (!withClv.length) return null;
    const avgClv = withClv.reduce((s, c) => s + (c.clvPct ?? 0), 0) / withClv.length;
    const beats = withClv.filter((c) => c.clvDirection === "BEAT").length;
    return { avgClv, beats, total: withClv.length };
  }, [clvByBet]);

  if (!bets.length) {
    return (
      <section className="panel p-4 text-xs">
        <div className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
          Closing Line Value Tracker
        </div>
        <p className="text-terminal-dim leading-relaxed">
          Track bets via the "+ Track" button on the Best Bets table. After
          enough samples, this panel shows your <strong className="text-terminal-ink">CLV</strong> — the
          single best predictor of long-term betting profitability. Beating
          the closing line consistently means your model is finding real
          information; losing to it means you're paying the bookmaker for
          information you don't have.
        </p>
      </section>
    );
  }

  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
          Closing Line Value Tracker
        </h2>
        {summary && (
          <div className="text-xs">
            <span className="text-terminal-dim">Avg CLV:</span>{" "}
            <span className={summary.avgClv >= 0 ? "text-terminal-accent font-semibold" : "text-terminal-danger font-semibold"}>
              {summary.avgClv >= 0 ? "+" : ""}{fmtPct(summary.avgClv, 2)}
            </span>{" "}
            <span className="text-terminal-dim">
              · Beat close {summary.beats}/{summary.total}
            </span>
          </div>
        )}
      </div>

      <table className="terminal text-xs">
        <thead>
          <tr>
            <th>Selection</th>
            <th>Placed @</th>
            <th>Stake</th>
            <th>Current</th>
            <th>CLV</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clvByBet.map((c) => (
            <tr key={c.bet.id}>
              <td className="font-semibold">{displaySelection(c.bet.selection)}</td>
              <td>{fmtAmerican(c.bet.priceAtPlacement)}</td>
              <td>${c.bet.stakeUSD.toLocaleString()}</td>
              <td>{c.currentPrice != null ? fmtAmerican(c.currentPrice) : "—"}</td>
              <td>
                {c.clvPct == null ? (
                  <span className="text-terminal-dim">—</span>
                ) : (
                  <span
                    className={
                      c.clvDirection === "BEAT"
                        ? "text-terminal-accent font-semibold"
                        : c.clvDirection === "LOST"
                        ? "text-terminal-danger font-semibold"
                        : "text-terminal-dim"
                    }
                  >
                    {c.clvPct >= 0 ? "+" : ""}{fmtPct(c.clvPct, 2)}
                  </span>
                )}
              </td>
              <td>
                <button
                  className="text-[10px] text-terminal-dim hover:text-terminal-danger"
                  onClick={() => {
                    removeBet(c.bet.id);
                    setVersion((v) => v + 1);
                  }}
                  title="Remove from tracker"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-[10px] text-terminal-dim leading-relaxed">
        CLV % = how much better your placement price was vs the current price,
        normalized in EV-equivalent terms. Persistent +CLV ≥ 2% over 100+ bets
        is the mark of a sharp bettor. Stored in your browser only — no server.
      </div>
    </section>
  );
}
