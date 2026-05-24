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
    { market: "playerProp", selection: "SGA OVER 30.5 PTS",        price: -115, book: "consensus", line: 30.5, player: "Shai Gilgeous-Alexander", prop: "PTS" },
    { market: "playerProp", selection: "SGA UNDER 30.5 PTS",       price: -105, book: "consensus", line: 30.5, player: "Shai Gilgeous-Alexander", prop: "PTS" },
    { market: "playerProp", selection: "SGA OVER 6.5 AST",         price: -120, book: "consensus", line: 6.5,  player: "Shai Gilgeous-Alexander", prop: "AST" },
    { market: "playerProp", selection: "J Williams OVER 19.5 PTS", price: -110, book: "consensus", line: 19.5, player: "Jalen Williams", prop: "PTS" },
    { market: "playerProp", selection: "Chet OVER 16.5 PTS",       price: -115, book: "consensus", line: 16.5, player: "Chet Holmgren", prop: "PTS" },
    { market: "playerProp", selection: "Chet OVER 9.5 REB",        price: -120, book: "consensus", line: 9.5,  player: "Chet Holmgren", prop: "REB" },
    { market: "playerProp", selection: "Dort OVER 8.5 PTS",        price: -115, book: "consensus", line: 8.5,  player: "Luguentz Dort", prop: "PTS" },
    { market: "playerProp", selection: "Wallace OVER 7.5 PTS",     price: -110, book: "consensus", line: 7.5,  player: "Cason Wallace", prop: "PTS" },
    { market: "playerProp", selection: "Hartenstein OVER 7.5 REB", price: -125, book: "consensus", line: 7.5,  player: "Isaiah Hartenstein", prop: "REB" },
    { market: "playerProp", selection: "Wemby OVER 25.5 PTS",      price: -115, book: "consensus", line: 25.5, player: "Victor Wembanyama", prop: "PTS" },
    { market: "playerProp", selection: "Wemby OVER 11.5 REB",      price: -125, book: "consensus", line: 11.5, player: "Victor Wembanyama", prop: "REB" },
    { market: "playerProp", selection: "Wemby OVER 3.5 BLK",       price: -130, book: "consensus", line: 3.5,  player: "Victor Wembanyama", prop: "BLK" },
    { market: "playerProp", selection: "Fox OVER 22.5 PTS",        price: -110, book: "consensus", line: 22.5, player: "De'Aaron Fox", prop: "PTS" },
    { market: "playerProp", selection: "Fox OVER 5.5 AST",         price: -120, book: "consensus", line: 5.5,  player: "De'Aaron Fox", prop: "AST" },
    { market: "playerProp", selection: "Vassell OVER 17.5 PTS",    price: -110, book: "consensus", line: 17.5, player: "Devin Vassell", prop: "PTS" },
    { market: "playerProp", selection: "Castle OVER 16.5 PTS",     price: -110, book: "consensus", line: 16.5, player: "Stephon Castle", prop: "PTS" },
    { market: "playerProp", selection: "Castle OVER 5.5 AST",      price: -115, book: "consensus", line: 5.5,  player: "Stephon Castle", prop: "AST" },
    { market: "playerProp", selection: "Johnson OVER 11.5 PTS",    price: -110, book: "consensus", line: 11.5, player: "Keldon Johnson", prop: "PTS" },
    { market: "playerProp", selection: "Harper OVER 9.5 PTS",      price: -115, book: "consensus", line: 9.5,  player: "Dylan Harper", prop: "PTS" },
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
