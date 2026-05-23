import { fmtNum, fmtPct } from "../lib/format";
import realDump from "../data/fixtures/_real.json";

const REAL = realDump as {
  backtest?: {
    sampleSize: number;
    marketBrier: number | null;
    spreadCoverRate: number | null;
    overRate: number | null;
    games: number;
  };
  fetchedAt?: string;
};

// Calibration is sourced from a REAL postseason backtest computed at build
// time: scripts/build-fixtures.mjs pulls every completed playoff game
// involving NYK or CLE this postseason, fetches the closing market odds and
// final score, and grades a) the market's de-vigged win-prob via Brier score,
// and b) the cover rates for spreads and totals. These are the actual
// measured market outcomes the model is being compared against — not a
// fabricated snapshot.

export function CalibrationPanel() {
  const b = REAL.backtest;
  const asOf = REAL.fetchedAt ? REAL.fetchedAt.split("T")[0] : "—";

  if (!b || !b.sampleSize) {
    return (
      <section className="panel p-4 text-xs text-terminal-dim">
        Calibration panel unavailable — backtest data not loaded.
      </section>
    );
  }

  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Calibration (real backtest)
      </h2>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <Metric
          label="Market Brier"
          value={b.marketBrier != null ? fmtNum(b.marketBrier, 3) : "—"}
          good={(b.marketBrier ?? 1) < 0.25}
        />
        <Metric
          label="Home cover rate"
          value={b.spreadCoverRate != null ? fmtPct(b.spreadCoverRate, 1) : "—"}
          good={(b.spreadCoverRate ?? 0) > 0.5}
        />
        <Metric
          label="Over rate"
          value={b.overRate != null ? fmtPct(b.overRate, 1) : "—"}
          good={(b.overRate ?? 0) > 0.5}
        />
      </div>
      <div className="text-[11px] text-terminal-dim mt-3 leading-relaxed">
        Sample: <span className="text-terminal-ink font-semibold">{b.sampleSize} real postseason games</span>{" "}
        involving NYK or CLE this playoffs, grading closing DraftKings lines vs
        actual results. As of {asOf}.
        <br />
        Brier <span className="text-terminal-ink">0.25 = a coin flip</span>;
        lower is better. Home cover rate above 50% means home teams beat the
        spread in the sample; over rate above 50% means totals went OVER more
        often than not.
      </div>
    </section>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-terminal-bg/40 rounded p-3">
      <div className="text-[10px] text-terminal-dim uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-semibold ${good ? "text-terminal-accent" : "text-terminal-danger"}`}>
        {value}
      </div>
    </div>
  );
}
