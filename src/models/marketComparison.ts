import type {
  BestBet,
  BettingLine,
  GameVerdict,
  PlayerProjection,
} from "../types";
import {
  americanToImplied,
  devigPair,
  evPerUnit,
  fractionalKelly,
} from "../lib/devig";
import { pNormalAbove } from "../lib/stats";

interface CompareInput {
  lines: BettingLine[];
  verdict: GameVerdict;
  players: PlayerProjection[];
  homeTeam: "NYK" | "CLE";
  kellyCap: number; // e.g. 0.25
}

function classify(edge: number): "LOW" | "MED" | "HIGH" {
  const a = Math.abs(edge);
  if (a >= 0.06) return "HIGH";
  if (a >= 0.03) return "MED";
  return "LOW";
}

function probPlayerOver(
  projection: PlayerProjection,
  prop: "PTS" | "REB" | "AST" | "3PM" | "BLK" | "STL",
  line: number,
): number {
  const dist =
    prop === "PTS" ? projection.pts
    : prop === "REB" ? projection.reb
    : prop === "AST" ? projection.ast
    : prop === "BLK" ? projection.blk
    : prop === "STL" ? projection.stl
    : projection.tpm;
  return pNormalAbove(line, dist.mean, dist.std);
}

export function buildBestBets(input: CompareInput): BestBet[] {
  const { lines, verdict, players, homeTeam, kellyCap } = input;
  const awayTeam = homeTeam === "NYK" ? "CLE" : "NYK";

  // Pre-pair markets for de-vigging
  const ml = pairLines(lines, "ml");
  const spread = pairLines(lines, "spread");
  const total = pairLines(lines, "total");

  const bets: BestBet[] = [];

  for (const line of lines) {
    const bookImplied = americanToImplied(line.price);
    let devig = bookImplied;
    let modelProb = 0;

    if (line.market === "ml") {
      const side = isHome(line.selection, homeTeam) ? "home" : "away";
      devig = (ml[side]?.devig ?? bookImplied);
      modelProb = isHome(line.selection, homeTeam) ? verdict.homeWinProb : verdict.awayWinProb;
    } else if (line.market === "spread") {
      const isHomeSide = line.selection.startsWith(homeTeam);
      const side = isHomeSide ? "home" : "away";
      devig = (spread[side]?.devig ?? bookImplied);
      // home covers if (awayPts - homePts) < line for home side (home -2.5 covers if margin < -2.5, i.e. away-home < -2.5)
      // Actually: home -2.5 means home wins by > 2.5. Margin (away - home) < -2.5.
      const homePoint = isHomeSide ? line.line ?? 0 : -(line.line ?? 0);
      // P(home covers) = P(margin (away-home) < homePoint) (when homePoint is negative meaning home is favored)
      // Use the verdict.margin distribution.
      const mu = verdict.margin.mean;
      const sigma = Math.max(1, verdict.margin.std);
      const z = (homePoint - mu) / sigma;
      const pHomeCovers = 0.5 * (1 + erf(z / Math.SQRT2));
      modelProb = isHomeSide ? pHomeCovers : 1 - pHomeCovers;
    } else if (line.market === "total") {
      const isOver = /OVER/i.test(line.selection);
      const side = isOver ? "over" : "under";
      devig = (total[side]?.devig ?? bookImplied);
      const mu = verdict.total.mean;
      const sigma = Math.max(1, verdict.total.std);
      const pOver = pNormalAbove(line.line ?? 0, mu, sigma);
      modelProb = isOver ? pOver : 1 - pOver;
    } else if (line.market === "playerProp") {
      const isOver = /OVER/i.test(line.selection);
      const proj = players.find((p) => p.name === line.player);
      if (!proj || line.prop == null || line.line == null) continue;
      const pOver = probPlayerOver(proj, line.prop, line.line);
      // Most player props ship one-sided here; use raw implied as devig fallback.
      modelProb = isOver ? pOver : 1 - pOver;
      // If we ever pair player props, use devig; for now devig = bookImplied
      devig = bookImplied;
    } else {
      continue;
    }

    const ev = evPerUnit(modelProb, line.price);
    const edge = modelProb - devig;
    const kelly = fractionalKelly(modelProb, line.price, kellyCap);

    bets.push({
      market: line.market,
      selection: line.selection,
      bookPrice: line.price,
      bookImpliedProb: bookImplied,
      devigProb: devig,
      modelProb,
      edgePct: edge,
      evPer1U: ev,
      kellyFraction: kelly,
      confidence: classify(edge),
      rationale: rationaleFor(line, modelProb, devig, awayTeam, homeTeam),
    });
  }

  return bets.sort((a, b) => b.evPer1U - a.evPer1U);
}

function isHome(selection: string, homeTeam: "NYK" | "CLE") {
  return selection.startsWith(homeTeam);
}

function pairLines(lines: BettingLine[], market: BettingLine["market"]) {
  const rows = lines.filter((l) => l.market === market);
  if (market === "ml") {
    const home = rows.find((r) => r.selection.startsWith("CLE"));
    const away = rows.find((r) => r.selection.startsWith("NYK"));
    const hi = home ? americanToImplied(home.price) : 0.5;
    const ai = away ? americanToImplied(away.price) : 0.5;
    const dv = devigPair(hi, ai);
    return { home: { devig: dv.a }, away: { devig: dv.b } };
  }
  if (market === "spread") {
    const home = rows.find((r) => r.selection.startsWith("CLE"));
    const away = rows.find((r) => r.selection.startsWith("NYK"));
    const hi = home ? americanToImplied(home.price) : 0.5;
    const ai = away ? americanToImplied(away.price) : 0.5;
    const dv = devigPair(hi, ai);
    return { home: { devig: dv.a }, away: { devig: dv.b } };
  }
  if (market === "total") {
    const over = rows.find((r) => /OVER/i.test(r.selection));
    const under = rows.find((r) => /UNDER/i.test(r.selection));
    const oi = over ? americanToImplied(over.price) : 0.5;
    const ui = under ? americanToImplied(under.price) : 0.5;
    const dv = devigPair(oi, ui);
    return { over: { devig: dv.a }, under: { devig: dv.b } };
  }
  return { home: { devig: 0.5 }, away: { devig: 0.5 } };
}

function rationaleFor(
  line: BettingLine,
  modelProb: number,
  devig: number,
  _awayTeam: "NYK" | "CLE",
  homeTeam: "NYK" | "CLE",
): string {
  const edge = modelProb - devig;
  const sign = edge >= 0 ? "+" : "";
  const edgePct = `${sign}${(edge * 100).toFixed(1)}%`;
  if (line.market === "ml") {
    return `Model gives ${(modelProb * 100).toFixed(1)}% to win vs ${(devig * 100).toFixed(1)}% de-vig market (${edgePct}). Driven by venue split, must-win desperation factor, and head-to-head matchup priors.`;
  }
  if (line.market === "spread") {
    return `Spread coverage prob ${(modelProb * 100).toFixed(1)}% vs ${(devig * 100).toFixed(1)}% (${edgePct}). Home/road split + matchup defense drive the gap from the market line.`;
  }
  if (line.market === "total") {
    return `Total side prob ${(modelProb * 100).toFixed(1)}% vs ${(devig * 100).toFixed(1)}% (${edgePct}). ${homeTeam} home pace and 3PT rate are the primary swing factors.`;
  }
  return `Player prop: model ${(modelProb * 100).toFixed(1)}% vs implied ${(devig * 100).toFixed(1)}% (${edgePct}). Projection blends matchup, minutes load, and recent form.`;
}

// Local copy of erf to avoid circular import
function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}
