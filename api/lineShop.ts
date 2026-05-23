import type { BettingLine } from "../src/types";

export const config = { runtime: "edge" };

// Multi-book line-shopper. Pulls every available US sportsbook for tonight's
// game and returns BEST price per market. Highest-EV operational improvement
// in real betting — beats any model upgrade for ROI.
//
// Requires ODDS_API_KEY (free tier 500 req/mo at the-odds-api.com).
// Without the key, returns a clear "key required" payload so the UI can
// display an explanatory state without breaking.

interface BookPrice {
  book: string;
  price: number;
  line?: number;
  selection: string;
}

interface BestLine {
  market: "spread" | "total" | "ml";
  side: "home" | "away" | "over" | "under";
  best: BookPrice;
  allBooks: BookPrice[];
}

async function fetchAllBooks(apiKey: string) {
  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${apiKey}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Odds API ${r.status}`);
  const data = (await r.json()) as Array<{
    home_team: string;
    away_team: string;
    bookmakers: Array<{
      title: string;
      markets: Array<{ key: string; outcomes: Array<{ name: string; price: number; point?: number }> }>;
    }>;
  }>;
  return data.find(
    (g) => /Cleveland Cavaliers/i.test(g.home_team) && /New York Knicks/i.test(g.away_team),
  );
}

function pickBest(books: BookPrice[], market: BestLine["market"], side: BestLine["side"]): BestLine {
  // For ML / OVER / UNDER / spread cover side: highest American odds price = best.
  const sorted = [...books].sort((a, b) => b.price - a.price);
  return { market, side, best: sorted[0], allBooks: sorted };
}

export default async function handler() {
  const key = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ODDS_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({
        ready: false,
        reason: "ODDS_API_KEY not set",
        instructions:
          "Set ODDS_API_KEY in Vercel project env vars (free tier at https://the-odds-api.com). Once set, this endpoint returns the best available price per market across all US sportsbooks.",
      }),
      { headers: { "content-type": "application/json", "cache-control": "no-store" } },
    );
  }
  try {
    const game = await fetchAllBooks(key);
    if (!game) {
      return new Response(JSON.stringify({ ready: false, reason: "game not found on Odds API" }), {
        headers: { "content-type": "application/json" },
      });
    }
    // Per market, gather every book's offer for each side
    const mlHome: BookPrice[] = [], mlAway: BookPrice[] = [];
    const spreadHome: BookPrice[] = [], spreadAway: BookPrice[] = [];
    const totalOver: BookPrice[] = [], totalUnder: BookPrice[] = [];

    for (const bk of game.bookmakers) {
      for (const m of bk.markets) {
        for (const o of m.outcomes) {
          const entry = (side: string): BookPrice => ({
            book: bk.title, price: o.price, line: o.point, selection: side,
          });
          if (m.key === "h2h") {
            if (o.name === game.home_team) mlHome.push(entry("CLE ML"));
            else mlAway.push(entry("NYK ML"));
          } else if (m.key === "spreads") {
            if (o.name === game.home_team) spreadHome.push(entry(`CLE ${(o.point ?? 0) >= 0 ? "+" : ""}${o.point}`));
            else spreadAway.push(entry(`NYK ${(o.point ?? 0) >= 0 ? "+" : ""}${o.point}`));
          } else if (m.key === "totals") {
            if (/over/i.test(o.name)) totalOver.push(entry(`OVER ${o.point}`));
            else totalUnder.push(entry(`UNDER ${o.point}`));
          }
        }
      }
    }

    const best: BestLine[] = [
      pickBest(mlHome, "ml", "home"),
      pickBest(mlAway, "ml", "away"),
      pickBest(spreadHome, "spread", "home"),
      pickBest(spreadAway, "spread", "away"),
      pickBest(totalOver, "total", "over"),
      pickBest(totalUnder, "total", "under"),
    ];

    return new Response(
      JSON.stringify({
        ready: true,
        fetchedAt: new Date().toISOString(),
        best,
        bookCount: game.bookmakers.length,
      }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ready: false, reason: (e as Error).message }),
      { headers: { "content-type": "application/json" } },
    );
  }
}
