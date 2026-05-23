import type { EnsembleWeights } from "../models/ensemble";
import { fmtNum } from "../lib/format";

interface Props {
  weights: EnsembleWeights;
  setWeights: (w: EnsembleWeights) => void;
  iterations: number;
  setIterations: (n: number) => void;
  seed: number;
  setSeed: (n: number) => void;
}

export function EnsembleControls({ weights, setWeights, iterations, setIterations, seed, setSeed }: Props) {
  const update = <K extends keyof EnsembleWeights>(k: K, v: number) =>
    setWeights({ ...weights, [k]: v });

  return (
    <section className="panel p-4 space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
        Ensemble Weights
      </h2>
      <Slider label="Monte Carlo" value={weights.monteCarlo} onChange={(v) => update("monteCarlo", v)} />
      <Slider label="Regression" value={weights.regression} onChange={(v) => update("regression", v)} />
      <hr className="border-terminal-border" />
      <div className="text-[11px] text-terminal-dim">Per-player tilt knobs</div>
      <Slider label="Matchup" value={weights.matchup} onChange={(v) => update("matchup", v)} />
      <Slider label="Venue" value={weights.venue} onChange={(v) => update("venue", v)} max={1.5} />
      <Slider label="Recent Form" value={weights.form} onChange={(v) => update("form", v)} />
      <Slider label="Sentiment (low)" value={weights.sentiment} onChange={(v) => update("sentiment", v)} />
      <hr className="border-terminal-border" />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="block">
          <div className="text-terminal-dim">Iterations</div>
          <input
            type="number"
            value={iterations}
            min={1000}
            step={1000}
            max={50000}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="mt-1 w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1"
          />
        </label>
        <label className="block">
          <div className="text-terminal-dim">Seed</div>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="mt-1 w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1"
          />
        </label>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  onChange,
  max = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="block text-xs">
      <div className="flex justify-between">
        <span className="text-terminal-dim">{label}</span>
        <span>{fmtNum(value, 2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}
