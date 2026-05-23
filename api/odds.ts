import { ODDS as FIXTURE_ODDS } from "../src/data/fixtures/odds";
import type { BettingLine } from "../src/types";

export const config = { runtime: "edge" };

const ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds";

async function fetchLive(apiKey: string): Promise<BettingLine[] | null> {
  try {
    const url = `${ODDS_API_URL}?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      home_team: string;
      away_team: string;
      bookmakers: Array<{
        title: string;
        markets: Array<{
          key: string;
          outcomes: Array<{ name: string; price: number; point?: number }>;
        }>;
      }>;
    }>;
    const game = data.find(
      (g) =>
        /Cleveland Cavaliers/i.test(g.home_team) &&
        /New York Knicks/i.test(g.away_team),
    );
    if (!game) return null;
    const lines: BettingLine[] = [];
    for (const bk of game.bookmakers.slice(0, 1)) {
      for (const m of bk.markets) {
        for (const o of m.outcomes) {
          if (m.key === "h2h") {
            lines.push({
              market: "ml",
              selection: `${o.name === game.home_team ? "CLE" : "NYK"} ML`,
              price: o.price,
              book: bk.title,
            });
          } else if (m.key === "spreads") {
            const side = o.name === game.home_team ? "CLE" : "NYK";
            lines.push({
              market: "spread",
              selection: `${side} ${(o.point ?? 0) > 0 ? "+" : ""}${o.point}`,
              price: o.price,
              line: o.point,
              book: bk.title,
            });
          } else if (m.key === "totals") {
            lines.push({
              market: "total",
              selection: `${o.name.toUpperCase()} ${o.point}`,
              price: o.price,
              line: o.point,
              book: bk.title,
            });
          }
        }
      }
    }
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

export default async function handler() {
  const key = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ODDS_API_KEY;
  if (key) {
    const live = await fetchLive(key);
    if (live) {
      const propFixtures = FIXTURE_ODDS.filter((o) => o.market === "playerProp");
      return new Response(
        JSON.stringify({
          data: [...live, ...propFixtures],
          provenance: "LIVE",
          fetchedAt: new Date().toISOString(),
          source: "the-odds-api.com + fixture (props)",
        }),
        {
          headers: {
            "content-type": "application/json",
            "cache-control": "s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }
  }
  return new Response(
    JSON.stringify({
      data: FIXTURE_ODDS,
      provenance: "FIXTURE",
      fetchedAt: new Date().toISOString(),
      source: "edge/fixtures/odds.ts (set ODDS_API_KEY for live)",
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
