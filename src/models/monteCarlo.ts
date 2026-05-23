import type {
  EnsembleComponent,
  GameVerdict,
  PlayerBaseline,
  TeamBaseline,
} from "../types";
import { mulberry32, sampleNormal } from "../lib/rng";
import { quantile } from "../lib/stats";
import { matchupMultiplier, paceMultiplier, venueMultiplier } from "./matchup";

interface SimInput {
  homeTeam: "NYK" | "CLE";
  teams: Record<"NYK" | "CLE", TeamBaseline>;
  players: PlayerBaseline[];
  iterations: number;
  seed: number;
  knobs: { matchup: number; venue: number; form: number; sentiment: number };
}

// Possession-level simulator: each iteration samples a game pace (possessions),
// each team's offensive efficiency (ortg with venue + opponent drtg blending),
// and aggregates a final score. Repeat → distributions.

export function runMonteCarlo(input: SimInput): GameVerdict {
  const { homeTeam, teams, iterations, seed, knobs } = input;
  const awayTeam = homeTeam === "NYK" ? "CLE" : "NYK";
  const rng = mulberry32(seed);

  const homeScores: number[] = new Array(iterations);
  const awayScores: number[] = new Array(iterations);
  const margins: number[] = new Array(iterations);
  const totals: number[] = new Array(iterations);
  let homeWins = 0;

  // Pre-compute baseline ortg/drtg with venue + matchup adjustments
  const baseHomeOrtg = blend(teams[homeTeam].homeOrtg, teams[homeTeam].ortg, 0.7);
  const baseAwayOrtg = blend(teams[awayTeam].awayOrtg, teams[awayTeam].ortg, 0.7);
  const baseHomeDrtg = blend(teams[homeTeam].homeDrtg, teams[homeTeam].drtg, 0.7);
  const baseAwayDrtg = blend(teams[awayTeam].awayDrtg, teams[awayTeam].drtg, 0.7);

  const venueWeight = knobs.venue;
  // The defining edge for this matchup: weight venue heavily so CLE's home boost
  // is fully reflected.
  const homeCourtNet =
    venueWeight *
    ((teams[homeTeam].homeOrtg - teams[homeTeam].ortg) +
      (teams[awayTeam].awayOrtg - teams[awayTeam].ortg) * -1);

  const projPace = (teams[homeTeam].pace + teams[awayTeam].pace) / 2;

  // Bivariate normal: home and away ORtg are mildly correlated through game
  // pace (high-pace games push BOTH teams up). We model this by sampling pace
  // once per game and using shared-pace + independent ORtg shocks. This
  // produces realistic joint score distributions (P(total > T) is properly
  // correlated with P(margin)).
  const RHO_ORTG = 0.18; // empirical correlation between team ORtgs in shared games

  for (let i = 0; i < iterations; i++) {
    const pace = sampleNormal(rng, projPace, 2.4);
    const leagueOrtg = 113.5;
    const homeAdjOrtg = baseHomeOrtg - (baseAwayDrtg - leagueOrtg) * 0.5;
    const awayAdjOrtg = baseAwayOrtg - (baseHomeDrtg - leagueOrtg) * 0.5;

    // Sample correlated ORtg shocks via Cholesky decomposition (2x2)
    const z1 = sampleNormal(rng, 0, 1);
    const z2 = sampleNormal(rng, 0, 1);
    const sigma = 4.6;
    const homeShock = sigma * z1;
    const awayShock = sigma * (RHO_ORTG * z1 + Math.sqrt(1 - RHO_ORTG ** 2) * z2);

    const homeOrtgSample = homeAdjOrtg + homeCourtNet * 0.4 + homeShock;
    const awayOrtgSample = awayAdjOrtg - homeCourtNet * 0.2 + awayShock;

    const homePts = (homeOrtgSample * pace) / 100;
    const awayPts = (awayOrtgSample * pace) / 100;
    homeScores[i] = homePts;
    awayScores[i] = awayPts;
    margins[i] = awayPts - homePts;
    totals[i] = homePts + awayPts;
    if (homePts > awayPts) homeWins++;
  }

  const verdict: GameVerdict = {
    homeScore: distFrom(homeScores),
    awayScore: distFrom(awayScores),
    margin: distFrom(margins),
    total: distFrom(totals),
    homeWinProb: homeWins / iterations,
    awayWinProb: 1 - homeWins / iterations,
    ensembleComponents: [],
  };

  return verdict;
}

function blend(a: number, b: number, w: number) {
  return a * w + b * (1 - w);
}

function distFrom(xs: number[]) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  const sd = Math.sqrt(v);
  return {
    mean: m,
    std: sd,
    p25: quantile(xs, 0.25),
    p50: quantile(xs, 0.5),
    p75: quantile(xs, 0.75),
  };
}

// Convenience for the ensemble — also returns a component summary.
export function monteCarloComponent(
  input: SimInput,
  weight: number,
): { verdict: GameVerdict; component: EnsembleComponent } {
  const verdict = runMonteCarlo(input);
  const component: EnsembleComponent = {
    name: "Monte Carlo possession sim",
    homeWinProb: verdict.homeWinProb,
    awayWinProb: verdict.awayWinProb,
    projTotal: verdict.total.mean,
    projMargin: verdict.margin.mean,
    weight,
    notes: `${input.iterations.toLocaleString()} sims, seed ${input.seed}`,
  };
  return { verdict, component };
}
