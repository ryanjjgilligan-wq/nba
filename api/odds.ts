import type { BettingLine } from "../src/types";
import { ODDS as BUNDLED_ODDS, ODDS_META } from "../src/data/fixtures/odds";

export const config = { runtime: "edge" };

// Live odds endpoint — no API key required. Pulls real DraftKings closing
// odds from ESPN's public scoreboard. Falls back to bundled odds (which are
// themselves real, pulled at build time by scripts/build-fixtures.mjs) if
// the live call fails.

interface EspnOdds {
  provider?: { name?: string };
  details?: string;
  overUnder?: number;
  spread?: number;
  pointSpread?: {
    home?: { close?: { line?: string; odds?: string }; open?: { line?: string; odds?: string } };
    away?: { close?: { line?: string; odds?: string }; open?: { line?: string; odds?: string } };
  };
  moneyline?: {
    home?: { close?: { odds?: string } };
    away?: { close?: { odds?: string } };
  };
  total?: {
    over?: { close?: { odds?: string } };
    under?: { close?: { odds?: string } };
  };
}

async function fetchLive(): Promise<{ lines: BettingLine[]; provider: string } | null> {
  try {
    const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard", {
      headers: { accept: "application/json" },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as {
      events?: Array<{
        name?: string;
        competitions?: Array<{
          odds?: EspnOdds[];
          competitors?: Array<{ team: { id: string }; homeAway: "home" | "away" }>;
        }>;
      }>;
    };
    const g = d.events?.find((e) => /Knicks.*Cavaliers|Cavaliers.*Knicks/.test(e.name ?? ""));
    const o = g?.competitions?.[0]?.odds?.[0];
    if (!o) return null;

    const spreadHome = Number(o.pointSpread?.home?.close?.line ?? o.spread ?? -2.5);
    const spreadAway = -spreadHome;
    const total = Number(o.overUnder ?? 215.5);
    const homeStr = spreadHome >= 0 ? `+${spreadHome}` : `${spreadHome}`;
    const awayStr = spreadAway >= 0 ? `+${spreadAway}` : `${spreadAway}`;

    const lines: BettingLine[] = [
      { market: "spread", selection: `CLE ${homeStr}`, price: Number(o.pointSpread?.home?.close?.odds ?? -110), book: o.provider?.name ?? "DraftKings", line: spreadHome },
      { market: "spread", selection: `NYK ${awayStr}`, price: Number(o.pointSpread?.away?.close?.odds ?? -110), book: o.provider?.name ?? "DraftKings", line: spreadAway },
      { market: "ml", selection: "CLE ML", price: Number(o.moneyline?.home?.close?.odds ?? -130), book: o.provider?.name ?? "DraftKings" },
      { market: "ml", selection: "NYK ML", price: Number(o.moneyline?.away?.close?.odds ?? 110), book: o.provider?.name ?? "DraftKings" },
      { market: "total", selection: `OVER ${total}`, price: Number(o.total?.over?.close?.odds ?? -110), book: o.provider?.name ?? "DraftKings", line: total },
      { market: "total", selection: `UNDER ${total}`, price: Number(o.total?.under?.close?.odds ?? -110), book: o.provider?.name ?? "DraftKings", line: total },
    ];
    // Merge in the bundled player props (ESPN free endpoint doesn't expose them)
    const propLines = BUNDLED_ODDS.filter((l) => l.market === "playerProp");
    return { lines: [...lines, ...propLines], provider: o.provider?.name ?? "DraftKings" };
  } catch {
    return null;
  }
}

export default async function handler() {
  const live = await fetchLive();
  if (live) {
    return new Response(
      JSON.stringify({
        data: live.lines,
        provenance: "LIVE",
        fetchedAt: new Date().toISOString(),
        source: `ESPN scoreboard / ${live.provider} closing odds (free, no key)`,
      }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }
  return new Response(
    JSON.stringify({
      data: BUNDLED_ODDS,
      provenance: ODDS_META.provider === "fallback" ? "FIXTURE" : "LIVE",
      fetchedAt: new Date().toISOString(),
      source: `bundled ${ODDS_META.provider} (build-time fetch)`,
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
