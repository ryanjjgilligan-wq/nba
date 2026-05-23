import type { BettingLine } from "../../types";

// Default lines per the brief; user-editable in UI; replaced with live data when
// ODDS_API_KEY is present. American odds.

export const ODDS: BettingLine[] = [
  // Spread
  { market: "spread", selection: "CLE -2.5", price: -110, book: "consensus", line: -2.5 },
  { market: "spread", selection: "NYK +2.5", price: -110, book: "consensus", line: 2.5 },
  // Moneyline
  { market: "ml", selection: "CLE ML", price: -126, book: "consensus" },
  { market: "ml", selection: "NYK ML", price: 108, book: "consensus" },
  // Total
  { market: "total", selection: "OVER 213.5", price: -110, book: "consensus", line: 213.5 },
  { market: "total", selection: "UNDER 213.5", price: -110, book: "consensus", line: 213.5 },

  // Player props
  { market: "playerProp", selection: "Brunson OVER 28.5 PTS", price: -115, book: "consensus", line: 28.5, player: "Jalen Brunson", prop: "PTS" },
  { market: "playerProp", selection: "Brunson UNDER 28.5 PTS", price: -105, book: "consensus", line: 28.5, player: "Jalen Brunson", prop: "PTS" },
  { market: "playerProp", selection: "Towns OVER 22.5 PTS", price: -110, book: "consensus", line: 22.5, player: "Karl-Anthony Towns", prop: "PTS" },
  { market: "playerProp", selection: "Towns OVER 10.5 REB", price: -120, book: "consensus", line: 10.5, player: "Karl-Anthony Towns", prop: "REB" },
  { market: "playerProp", selection: "Bridges OVER 16.5 PTS", price: -115, book: "consensus", line: 16.5, player: "Mikal Bridges", prop: "PTS" },
  { market: "playerProp", selection: "Anunoby OVER 14.5 PTS", price: -110, book: "consensus", line: 14.5, player: "OG Anunoby", prop: "PTS" },
  { market: "playerProp", selection: "Hart OVER 9.5 REB", price: -125, book: "consensus", line: 9.5, player: "Josh Hart", prop: "REB" },
  { market: "playerProp", selection: "Mitchell OVER 28.5 PTS", price: -115, book: "consensus", line: 28.5, player: "Donovan Mitchell", prop: "PTS" },
  { market: "playerProp", selection: "Mitchell OVER 4.5 AST", price: -130, book: "consensus", line: 4.5, player: "Donovan Mitchell", prop: "AST" },
  { market: "playerProp", selection: "Garland OVER 18.5 PTS", price: -110, book: "consensus", line: 18.5, player: "Darius Garland", prop: "PTS" },
  { market: "playerProp", selection: "Mobley OVER 18.5 PTS", price: -110, book: "consensus", line: 18.5, player: "Evan Mobley", prop: "PTS" },
  { market: "playerProp", selection: "Mobley OVER 10.5 REB", price: -120, book: "consensus", line: 10.5, player: "Evan Mobley", prop: "REB" },
  { market: "playerProp", selection: "Allen OVER 11.5 REB", price: -130, book: "consensus", line: 11.5, player: "Jarrett Allen", prop: "REB" },
  { market: "playerProp", selection: "Strus OVER 2.5 3PM", price: -125, book: "consensus", line: 2.5, player: "Max Strus", prop: "3PM" },
  { market: "playerProp", selection: "Merrill OVER 1.5 3PM", price: -140, book: "consensus", line: 1.5, player: "Sam Merrill", prop: "3PM" },
];
