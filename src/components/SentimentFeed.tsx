import type { SentimentItem } from "../types";
import { fmtPct, fmtSign } from "../lib/format";

interface Props {
  items: SentimentItem[];
}

export function SentimentFeed({ items }: Props) {
  const sorted = [...items].sort(
    (a, b) =>
      b.credibility * Math.abs(b.polarity) -
      a.credibility * Math.abs(a.polarity),
  );
  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Sentiment Feed
      </h2>
      <div className="text-[11px] text-terminal-dim mb-3">
        Reporter signal, credibility-weighted. Sentiment is intentionally a
        low-influence feature — total cap on its swing is ±4% per player.
        Unverified rumors are flagged and down-weighted.
      </div>
      <ul className="space-y-2">
        {sorted.map((s) => (
          <li
            key={s.id}
            className="border border-terminal-border rounded p-2 text-xs"
          >
            <div className="flex justify-between items-baseline gap-2">
              <div className="font-semibold">
                {s.author}
                {s.unverified && (
                  <span className="ml-2 chip bg-terminal-danger/10 text-terminal-danger">
                    UNVERIFIED
                  </span>
                )}
                {s.team && (
                  <span
                    className={`ml-2 chip ${
                      s.team === "NYK"
                        ? "bg-terminal-nyk/15 text-terminal-nyk"
                        : "bg-terminal-cle/15 text-terminal-cle"
                    }`}
                  >
                    {s.team}
                  </span>
                )}
              </div>
              <div className="text-terminal-dim text-[10px]">
                cred {fmtPct(s.credibility, 0)} · polarity {fmtSign(s.polarity, 2)} · impact {fmtPct(s.weightOnProjection, 2)}
              </div>
            </div>
            <div className="mt-1 text-terminal-ink">{s.text}</div>
            <div className="mt-1 text-[10px] text-terminal-dim uppercase tracking-wider">
              {s.topic} · {new Date(s.ts).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
