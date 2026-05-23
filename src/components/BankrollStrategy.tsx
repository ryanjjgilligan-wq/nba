import { fmtNum, fmtPct } from "../lib/format";

interface Props {
  bankroll: number;
  kellyCap: number;
  setKellyCap: (k: number) => void;
}

interface Tier {
  min: number;
  max: number | null;
  label: string;
  recommendedCap: number;
  maxSingleBetPct: number;
  rationale: string;
}

const TIERS: Tier[] = [
  {
    min: 0, max: 1000, label: "< $1,000",
    recommendedCap: 0.125,
    maxSingleBetPct: 0.02,
    rationale: "Variance kills small bankrolls. Use 1/8 Kelly to survive long enough for edges to compound.",
  },
  {
    min: 1000, max: 10000, label: "$1k – $10k",
    recommendedCap: 0.25,
    maxSingleBetPct: 0.05,
    rationale: "Default 1/4 Kelly — real growth, recoverable drawdowns. This is the sweet spot for most users.",
  },
  {
    min: 10000, max: 100000, label: "$10k – $100k",
    recommendedCap: 0.333,
    maxSingleBetPct: 0.07,
    rationale: "Can afford more variance for more growth. Still well below full Kelly.",
  },
  {
    min: 100000, max: null, label: "$100k+",
    recommendedCap: 0.5,
    maxSingleBetPct: 0.10,
    rationale: "At scale, line shopping and vig matter more than Kelly fraction. Maintain stop-loss rules.",
  },
];

function tierFor(bankroll: number) {
  return TIERS.find((t) => bankroll >= t.min && (t.max === null || bankroll < t.max))!;
}

export function BankrollStrategy({ bankroll, kellyCap, setKellyCap }: Props) {
  const tier = tierFor(bankroll);
  const matchesRecommendation = Math.abs(kellyCap - tier.recommendedCap) < 0.01;
  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Bankroll Strategy
      </h2>
      <div className="text-xs space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            Your tier:{" "}
            <span className="text-terminal-ink font-semibold">{tier.label}</span>
          </div>
          {matchesRecommendation ? (
            <span className="chip bg-terminal-accent/15 text-terminal-accent">
              KELLY MATCHES TIER
            </span>
          ) : (
            <button
              className="chip bg-terminal-warn/15 text-terminal-warn cursor-pointer hover:bg-terminal-warn/25"
              onClick={() => setKellyCap(tier.recommendedCap)}
            >
              SET TO RECOMMENDED ({fmtNum(tier.recommendedCap, 2)})
            </button>
          )}
        </div>
        <div className="text-terminal-dim leading-relaxed">
          {tier.rationale}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Item label="Recommended Kelly cap" value={fmtNum(tier.recommendedCap, 2)} />
          <Item label="Max single bet" value={`${fmtPct(tier.maxSingleBetPct, 0)} = $${(bankroll * tier.maxSingleBetPct).toFixed(0)}`} />
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-terminal-dim text-[11px] hover:text-terminal-ink">
            All bankroll tiers
          </summary>
          <table className="terminal mt-2 text-[10px]">
            <thead>
              <tr>
                <th>Bankroll</th>
                <th>Kelly cap</th>
                <th>Max single bet</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.label} className={t === tier ? "bg-terminal-border/40" : ""}>
                  <td>{t.label}</td>
                  <td>{fmtNum(t.recommendedCap, 2)}</td>
                  <td>{fmtPct(t.maxSingleBetPct, 0)}</td>
                  <td className="text-terminal-dim">{t.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <div className="mt-2 text-[10px] text-terminal-dim border-t border-terminal-border pt-2 leading-relaxed">
          <strong className="text-terminal-ink">Daily playbook</strong>: edge ≥
          4% HIGH → 1/4 Kelly · 2-4% MED → 1/8 Kelly · &lt; 2% → skip. Set a
          daily stop-loss at 10% of bankroll. Always line-shop at 3+ books
          before placing a bet.
        </div>
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-terminal-bg/40 rounded p-2">
      <div className="text-[10px] text-terminal-dim uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-terminal-ink">{value}</div>
    </div>
  );
}
