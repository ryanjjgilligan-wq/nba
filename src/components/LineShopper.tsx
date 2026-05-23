import { useEffect, useState } from "react";
import { fmtAmerican } from "../lib/format";

interface BookPrice {
  book: string;
  price: number;
  line?: number;
  selection: string;
}
interface BestLine {
  market: "spread" | "total" | "ml";
  side: string;
  best: BookPrice;
  allBooks: BookPrice[];
}
interface LineShopState {
  ready: boolean;
  reason?: string;
  instructions?: string;
  fetchedAt?: string;
  best?: BestLine[];
  bookCount?: number;
}

export function LineShopper() {
  const [state, setState] = useState<LineShopState | null>(null);
  useEffect(() => {
    fetch("/api/lineShop")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ ready: false, reason: "fetch failed" }));
  }, []);

  if (!state) return null;

  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
          Multi-Book Line Shopper
        </h2>
        <span
          className={`chip ${
            state.ready
              ? "bg-terminal-accent/15 text-terminal-accent"
              : "bg-terminal-warn/15 text-terminal-warn"
          }`}
        >
          {state.ready ? `LIVE · ${state.bookCount} books` : "KEY REQUIRED"}
        </span>
      </div>

      {!state.ready && (
        <div className="text-xs text-terminal-dim leading-relaxed">
          <p className="mb-2">
            <strong className="text-terminal-ink">Highest-ROI feature there is.</strong>{" "}
            Same bet at different books prices differently. Closing a spread at
            -105 instead of -110 is +2.3% EV immediately, no model improvement
            needed.
          </p>
          <p className="mb-2">
            {state.instructions || state.reason}
          </p>
          <p className="text-[10px]">
            Sign up free at <span className="text-terminal-info">the-odds-api.com</span>{" "}
            (500 req/month), copy the key into Vercel project env vars as{" "}
            <span className="kbd">ODDS_API_KEY</span>, redeploy. This panel
            then auto-activates with all available US sportsbooks.
          </p>
        </div>
      )}

      {state.ready && state.best && (
        <div className="space-y-3">
          {state.best.map((b, i) => (
            <div key={i} className="border border-terminal-border rounded p-2">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold uppercase">
                  {b.market} · {b.side}
                </span>
                <span className="text-terminal-accent font-mono">
                  BEST: {fmtAmerican(b.best.price)} @ {b.best.book}
                  {b.best.line !== undefined ? ` (${b.best.line})` : ""}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-terminal-dim grid grid-cols-2 sm:grid-cols-3 gap-x-3">
                {b.allBooks.slice(1, 7).map((bk, j) => (
                  <span key={j}>
                    {bk.book}: {fmtAmerican(bk.price)}
                    {bk.line !== undefined ? ` (${bk.line})` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="text-[10px] text-terminal-dim">
            Cached 60s. Refresh before placing any bet — closing odds can move
            in the final minutes.
          </div>
        </div>
      )}
    </section>
  );
}
