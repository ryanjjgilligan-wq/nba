import type { ModelDisagreement } from "../types";

interface Props {
  items: ModelDisagreement[];
}

export function ModelDisagreementPanel({ items }: Props) {
  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Model Disagreement
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-terminal-dim">
          Ensemble components and the market are aligned — no notable
          disagreement detected.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((d, i) => (
            <li
              key={i}
              className="border border-terminal-border rounded p-2 text-xs"
            >
              <div className="flex justify-between items-baseline">
                <div className="font-semibold">{d.topic}</div>
                <span
                  className={`chip ${
                    d.classification === "EDGE"
                      ? "bg-terminal-accent/15 text-terminal-accent"
                      : d.classification === "BLIND_SPOT"
                      ? "bg-terminal-danger/15 text-terminal-danger"
                      : "bg-terminal-border text-terminal-dim"
                  }`}
                >
                  {d.classification.replace("_", " ")}
                </span>
              </div>
              <div className="text-terminal-dim mt-1">{d.marketView}</div>
              <div className="text-terminal-ink">{d.modelView}</div>
              <div className="text-[10px] text-terminal-dim mt-1">
                {d.note}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
