import type { BettingLine, Tagged } from "../../types";
import { ODDS as FIXTURE_ODDS } from "../fixtures/odds";
import { fixtureProvider } from "./fixture";
import type { DataProvider } from "./types";

// Live provider — fetches THIS game's data when keys are present. Each method
// falls back to the fixture cleanly on any error (network, missing key, etc.).
// All fetches are routed through serverless functions in /api at runtime; the
// raw API calls in this file are kept for completeness so the provider also
// works in non-Vercel environments (SSR / tests).

const ODDS_API_URL =
  "https://api.the-odds-api.com/v4/sports/basketball_nba/odds";

async function fetchLiveOdds(apiKey: string): Promise<BettingLine[] | null> {
  try {
    const url = `${ODDS_API_URL}?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${apiKey}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
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
    for (const bk of game.bookmakers) {
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
            lines.push({
              market: "spread",
              selection: `${o.name === game.home_team ? "CLE" : "NYK"} ${(o.point ?? 0) > 0 ? "+" : ""}${o.point}`,
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

const now = () => new Date().toISOString();

export function buildLiveProvider(env: Record<string, string | undefined>): DataProvider {
  return {
    ...fixtureProvider,
    async getOdds(): Promise<Tagged<BettingLine[]>> {
      const key = env.ODDS_API_KEY;
      if (key) {
        const live = await fetchLiveOdds(key);
        if (live && live.length) {
          // Merge player props from fixtures (player props for NBA cost extra credits
          // on the Odds API; we keep the fixture props but mark game-level as LIVE).
          const propFixtures = FIXTURE_ODDS.filter((o) => o.market === "playerProp");
          return {
            data: [...live, ...propFixtures],
            provenance: "LIVE",
            fetchedAt: now(),
            source: "the-odds-api.com (game lines) + fixture (props)",
          };
        }
      }
      return fixtureProvider.getOdds();
    },
    // Stats/sentiment live fetchers are wired through /api/* on Vercel. Locally
    // we keep them as fixtures unless explicitly wired; that's intentional so
    // the app stays deployable without keys.
  };
}
