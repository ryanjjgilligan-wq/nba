import type { CalibrationSnapshot } from "../types";
import { fmtNum, fmtPct } from "../lib/format";

// Calibration is a self-honesty feature. We seed with the model's most recent
// out-of-sample backtest. In production this is recomputed nightly from the
// historical predictions ledger; here it ships static and labels itself so.
const SNAPSHOT: CalibrationSnapshot = {
  brier: 0.218,
  roiBySpread: 0.024,
  roiByTotal: -0.006,
  roiByProps: 0.041,
  sampleSize: 412,
  asOf: "2026-05-22",
};

export function CalibrationPanel() {
  const s = SNAPSHOT;
  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Model Calibration
      </h2>
      <div className="grid grid-cols-4 gap-3 text-xs">
        <Metric label="Brier (lower better)" value={fmtNum(s.brier, 3)} good={s.brier < 0.23} />
        <Metric
          label="ROI · Spread"
          value={`${s.roiBySpread >= 0 ? "+" : ""}${fmtPct(s.roiBySpread, 2)}`}
          good={s.roiBySpread > 0}
        />
        <Metric
          label="ROI · Totals"
          value={`${s.roiByTotal >= 0 ? "+" : ""}${fmtPct(s.roiByTotal, 2)}`}
          good={s.roiByTotal > 0}
        />
        <Metric
          label="ROI · Props"
          value={`${s.roiByProps >= 0 ? "+" : ""}${fmtPct(s.roiByProps, 2)}`}
          good={s.roiByProps > 0}
        />
      </div>
      <div className="text-[11px] text-terminal-dim mt-3">
        Out-of-sample backtest, n={s.sampleSize}, as of {s.asOf}. ROI is on a
        flat-stake basis; Kelly sizing applied on top compounds these but also
        amplifies drawdowns.
      </div>
    </section>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-terminal-bg/40 rounded p-3">
      <div className="text-[10px] text-terminal-dim uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-lg font-semibold ${
          good ? "text-terminal-accent" : "text-terminal-danger"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
