import type { BettingLine } from "../../types";
import realDump from "./_real.json";

// Real DraftKings closing odds pulled live from ESPN's public scoreboard endpoint.
// Re-run scripts/build-fixtures.mjs to refresh; the /api/odds route also re-fetches
// at request time, so production deployments stay current automatically.

interface RealOdds {
  provider: string;
  spreadHome: number;
  spreadHomePrice: number;
  spreadAwayPrice: number;
  mlHome: number;
  mlAway: number;
  total: number;
  totalOverPrice: number;
  totalUnderPrice: number;
  openSpread: number;
  openTotal: string | null;
  openMlHome: string | null;
}

const REAL = realDump as { odds: RealOdds | null };
const o = REAL.odds;

function buildLines(o: RealOdds): BettingLine[] {
  const homeSpreadStr = o.spreadHome >= 0 ? `+${o.spreadHome}` : `${o.spreadHome}`;
  const awaySpreadVal = -o.spreadHome;
  const awaySpreadStr = awaySpreadVal >= 0 ? `+${awaySpreadVal}` : `${awaySpreadVal}`;

  return [
    // Spread
    { market: "spread", selection: `CLE ${homeSpreadStr}`, price: o.spreadHomePrice, book: o.provider, line: o.spreadHome },
    { market: "spread", selection: `NYK ${awaySpreadStr}`, price: o.spreadAwayPrice, book: o.provider, line: awaySpreadVal },
    // Moneyline
    { market: "ml", selection: "CLE ML", price: o.mlHome, book: o.provider },
    { market: "ml", selection: "NYK ML", price: o.mlAway, book: o.provider },
    // Total
    { market: "total", selection: `OVER ${o.total}`, price: o.totalOverPrice, book: o.provider, line: o.total },
    { market: "total", selection: `UNDER ${o.total}`, price: o.totalUnderPrice, book: o.provider, line: o.total },

    // Player props — representative lines (ESPN free endpoint doesn't expose
    // closing props). Re-verify against real DraftKings prop board before betting.
    { market: "playerProp", selection: "Brunson OVER 27.5 PTS",   price: -115, book: "consensus", line: 27.5, player: "Jalen Brunson", prop: "PTS" },
    { market: "playerProp", selection: "Brunson UNDER 27.5 PTS",  price: -105, book: "consensus", line: 27.5, player: "Jalen Brunson", prop: "PTS" },
    { market: "playerProp", selection: "Brunson OVER 6.5 AST",    price: -120, book: "consensus", line: 6.5,  player: "Jalen Brunson", prop: "AST" },
    { market: "playerProp", selection: "Towns OVER 20.5 PTS",     price: -110, book: "consensus", line: 20.5, player: "Karl-Anthony Towns", prop: "PTS" },
    { market: "playerProp", selection: "Towns OVER 10.5 REB",     price: -120, book: "consensus", line: 10.5, player: "Karl-Anthony Towns", prop: "REB" },
    { market: "playerProp", selection: "Bridges OVER 14.5 PTS",   price: -115, book: "consensus", line: 14.5, player: "Mikal Bridges", prop: "PTS" },
    { market: "playerProp", selection: "Anunoby OVER 16.5 PTS",   price: -110, book: "consensus", line: 16.5, player: "OG Anunoby", prop: "PTS" },
    { market: "playerProp", selection: "Hart OVER 7.5 REB",       price: -125, book: "consensus", line: 7.5,  player: "Josh Hart", prop: "REB" },
    { market: "playerProp", selection: "Mitchell OVER 28.5 PTS",  price: -115, book: "consensus", line: 28.5, player: "Donovan Mitchell", prop: "PTS" },
    { market: "playerProp", selection: "Mitchell OVER 5.5 AST",   price: -130, book: "consensus", line: 5.5,  player: "Donovan Mitchell", prop: "AST" },
    { market: "playerProp", selection: "Harden OVER 24.5 PTS",    price: -110, book: "consensus", line: 24.5, player: "James Harden", prop: "PTS" },
    { market: "playerProp", selection: "Harden OVER 7.5 AST",     price: -115, book: "consensus", line: 7.5,  player: "James Harden", prop: "AST" },
    { market: "playerProp", selection: "Mobley OVER 18.5 PTS",    price: -110, book: "consensus", line: 18.5, player: "Evan Mobley", prop: "PTS" },
    { market: "playerProp", selection: "Mobley OVER 9.5 REB",     price: -120, book: "consensus", line: 9.5,  player: "Evan Mobley", prop: "REB" },
    { market: "playerProp", selection: "Mobley OVER 1.5 BLK",     price: -130, book: "consensus", line: 1.5,  player: "Evan Mobley", prop: "BLK" },
    { market: "playerProp", selection: "Allen OVER 8.5 REB",      price: -130, book: "consensus", line: 8.5,  player: "Jarrett Allen", prop: "REB" },
    { market: "playerProp", selection: "Strus OVER 2.5 3PM",      price: -125, book: "consensus", line: 2.5,  player: "Max Strus", prop: "3PM" },
    { market: "playerProp", selection: "Merrill OVER 2.5 3PM",    price: -140, book: "consensus", line: 2.5,  player: "Sam Merrill", prop: "3PM" },
  ];
}

export const ODDS: BettingLine[] = o
  ? buildLines(o)
  : [
      { market: "spread", selection: "CLE -2.5", price: -110, book: "fallback", line: -2.5 },
      { market: "spread", selection: "NYK +2.5", price: -110, book: "fallback", line: 2.5 },
      { market: "ml", selection: "CLE ML", price: -130, book: "fallback" },
      { market: "ml", selection: "NYK ML", price: 110, book: "fallback" },
      { market: "total", selection: "OVER 213.5", price: -110, book: "fallback", line: 213.5 },
      { market: "total", selection: "UNDER 213.5", price: -110, book: "fallback", line: 213.5 },
    ];

export const ODDS_META = {
  provider: o?.provider ?? "fallback",
  openSpread: o?.openSpread,
  openTotal: o?.openTotal,
  openMlHome: o?.openMlHome,
  closeSpread: o?.spreadHome,
  closeTotal: o?.total,
  closeMlHome: o?.mlHome,
} as const;
