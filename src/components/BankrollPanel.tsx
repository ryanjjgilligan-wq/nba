import { fmtNum } from "../lib/format";

interface Props {
  bankroll: number;
  setBankroll: (b: number) => void;
  kellyCap: number;
  setKellyCap: (k: number) => void;
}

export function BankrollPanel({ bankroll, setBankroll, kellyCap, setKellyCap }: Props) {
  return (
    <section className="panel p-4 space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
        Bankroll & Staking
      </h2>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="block">
          <div className="text-terminal-dim">Bankroll (USD)</div>
          <input
            type="number"
            value={bankroll}
            min={0}
            step={50}
            onChange={(e) => setBankroll(Number(e.target.value))}
            className="mt-1 w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1"
          />
        </label>
        <label className="block">
          <div className="text-terminal-dim">
            Fractional-Kelly cap ({fmtNum(kellyCap, 2)})
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={kellyCap}
            onChange={(e) => setKellyCap(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>
      <div className="text-[11px] text-terminal-dim leading-relaxed">
        Default is 1/4 Kelly. Full Kelly maximizes long-run growth but tolerates
        deep drawdowns; fractional Kelly trades a sliver of EV for far smaller
        bankroll volatility. Stakes update live in the bets table.
      </div>
    </section>
  );
}
