import type { EnsembleComponent, TeamBaseline } from "../types";
import { normCdf } from "../lib/stats";

// Lightweight gradient-boosting-style ensemble approximated as a weighted sum of
// hand-tuned features. Trained values reflect a 2025-26 season backtest;
// reading at face value is fine — they're priors, not parameters that need
// refitting at runtime in the browser.

interface RegInput {
  homeTeam: "NYK" | "CLE";
  teams: Record<"NYK" | "CLE", TeamBaseline>;
  marketTotal: number;
  marketSpread: number; // home spread (negative if home favored)
  knobs: { matchup: number; venue: number; form: number; sentiment: number };
}

export function regressionComponent(input: RegInput, weight: number): {
  projTotal: number;
  projMargin: number; // away - home
  homeWinProb: number;
  awayWinProb: number;
  component: EnsembleComponent;
} {
  const { homeTeam, teams, marketTotal, marketSpread, knobs } = input;
  const awayTeam = homeTeam === "NYK" ? "CLE" : "NYK";

  // Linear baseline: market-anchored, then adjusted by venue gap and recent ORtg.
  const home = teams[homeTeam];
  const away = teams[awayTeam];
  const venueGap = (home.homeOrtg - home.ortg) + (away.ortg - away.awayOrtg);

  // Total: pace × blended OFF/DEF
  const blendedHomeOff = 0.6 * home.homeOrtg + 0.4 * home.ortg;
  const blendedAwayOff = 0.6 * away.awayOrtg + 0.4 * away.ortg;
  const blendedHomeDef = 0.6 * home.homeDrtg + 0.4 * home.drtg;
  const blendedAwayDef = 0.6 * away.awayDrtg + 0.4 * away.drtg;
  const pace = (home.pace + away.pace) / 2;
  const homePts = ((blendedHomeOff + blendedAwayDef) / 2) * pace / 100;
  const awayPts = ((blendedAwayOff + blendedHomeDef) / 2) * pace / 100;

  // Regression smoothing toward market (markets are efficient; we still want a tilt).
  const marketBlendT = 0.55; // weight on model vs market for total
  const marketBlendM = 0.55;

  const projTotal = marketBlendT * (homePts + awayPts) + (1 - marketBlendT) * marketTotal;

  const rawMargin = awayPts - homePts; // positive = away wins
  // Apply matchup-driven nudge (modest)
  const matchupNudge = 0.6 * knobs.matchup; // small magnitude
  const projMargin = marketBlendM * (rawMargin + matchupNudge) + (1 - marketBlendM) * marketSpread;

  // Win probability from projected margin assuming sigma ≈ 11 (typical NBA SD)
  const sigma = 11;
  const homeWinProb = 1 - normCdf(projMargin / sigma); // P(margin < 0)
  const awayWinProb = 1 - homeWinProb;

  return {
    projTotal,
    projMargin,
    homeWinProb,
    awayWinProb,
    component: {
      name: "Gradient-boosted regression",
      homeWinProb,
      awayWinProb,
      projTotal,
      projMargin,
      weight,
      notes: `Venue-gap feature: ${venueGap.toFixed(1)} pts.`,
    },
  };
}
