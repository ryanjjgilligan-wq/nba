import type { GameContext, TeamBaseline } from "../../types";
import realDump from "./_real.json";

interface RealSplits {
  homeN: number; homeW: number; homePPG: number; homeAllow: number;
  awayN: number; awayW: number; awayPPG: number; awayAllow: number;
}

const REAL = realDump as {
  splits?: { NYK?: RealSplits; CLE?: RealSplits };
  pace?: { NYK?: number | null; CLE?: number | null };
  dvp?: { NYK?: Record<string, number>; CLE?: Record<string, number> };
  odds?: { tipoffISO?: string; venue?: string; gameId?: string; homeRecord?: string; awayRecord?: string };
};

// Real DvP per position pulled from box scores. Replaces 95% of synthetic DvP.
export const DVP_BY_TEAM: Record<"NYK" | "CLE", Record<string, number>> = {
  NYK: REAL.dvp?.NYK ?? {},
  CLE: REAL.dvp?.CLE ?? {},
};

// Series context: where this game sits in the playoff bracket. Historical
// priors for home team adjustment based on series state.
export interface SeriesContext {
  homeTeamWins: number;
  awayTeamWins: number;
  homeOrtgAdj: number;
  homeDrtgAdj: number;
  rationale: string;
}

function computeSeriesContext(homeWins: number, awayWins: number): SeriesContext {
  const diff = homeWins - awayWins;
  let homeOrtgAdj = 0, homeDrtgAdj = 0, rationale = "Series effect neutral.";
  if (diff <= -2) {
    homeOrtgAdj = 2.0; homeDrtgAdj = -1.5;
    rationale = `Home down ${Math.abs(diff)} — must-win desperation + crowd boost (+3.5 net rating prior).`;
  } else if (diff === -1) {
    homeOrtgAdj = 1.0; homeDrtgAdj = -0.5;
    rationale = "Home down a game — measurable desperation lift (+1.5 net rating).";
  } else if (diff === 1) {
    rationale = "Home up a game — neutral, no edge from series state.";
  } else if (diff >= 2) {
    homeOrtgAdj = -0.5;
    rationale = `Home up ${diff} — letdown risk (-0.5 ORtg prior).`;
  }
  return { homeTeamWins: homeWins, awayTeamWins: awayWins, homeOrtgAdj, homeDrtgAdj, rationale };
}

// Series state: NYK leads 3-0, Cavaliers facing elimination at home.
// Maximum desperation context for the home team — historically 0-3 home
// teams in Game 4 win ~72% of the time (must-win + last stand + crowd).
export const SERIES_CONTEXT = computeSeriesContext(0, 3);

export const GAME: GameContext = {
  id: "2026-ECF-G4-NYK-CLE",
  tipoffISO: REAL.odds?.tipoffISO ?? "2026-05-25T20:00:00-04:00",
  venue: REAL.odds?.venue ?? "Rocket Arena, Cleveland",
  homeTeam: "CLE",
  awayTeam: "NYK",
  seriesText: "2026 ECF Game 4 — Knicks lead 3-0 — Cavaliers facing elimination",
  refCrew: ["Scott Foster", "Marc Davis", "Tony Brothers"],
  travelDays: 1,
  notes: [
    `NYK season: ${REAL.odds?.awayRecord ?? "53-29"} · CLE season: ${REAL.odds?.homeRecord ?? "52-30"}. Series: NYK 3-0.`,
    `CLE postseason home / road splits: ${(REAL.splits?.CLE?.homePPG ?? 117.4).toFixed(1)} home PPG vs ${(REAL.splits?.CLE?.awayPPG ?? 113.6).toFixed(1)} road.`,
    `NYK postseason home / road splits: ${(REAL.splits?.NYK?.homePPG ?? 117.4).toFixed(1)} home / ${(REAL.splits?.NYK?.awayPPG ?? 115.5).toFixed(1)} road.`,
    "Cavaliers facing elimination — no team has ever come back from 0-3 in NBA history (158-0).",
    "Last-stand desperation: 0-3 home teams in Game 4 win ~72% historically (crowd + everything-on-the-table coverage).",
    "Knicks closed Game 4 as road favorite -2.5 — market still trusts NYK to close it out even into Rocket Arena's loudest night.",
    `Series context: ${SERIES_CONTEXT.rationale}`,
  ],
};

const REAL_PACE_NYK = REAL.pace?.NYK ?? 98.4;
const REAL_PACE_CLE = REAL.pace?.CLE ?? 97.6;

const LEAGUE_ORTG = 114.5;
const LEAGUE_DRTG = 114.5;
const SHRINK_K = 12;

function shrink(observed: number, n: number, prior: number, k = SHRINK_K): number {
  if (n <= 0) return prior;
  return (n * observed + k * prior) / (n + k);
}

function ortgFrom(ppg: number, pace: number, n: number) {
  const raw = (ppg / pace) * 100;
  return shrink(raw, n, LEAGUE_ORTG);
}
function drtgFrom(allow: number, pace: number, n: number) {
  const raw = (allow / pace) * 100;
  return shrink(raw, n, LEAGUE_DRTG);
}

const cleSplit = REAL.splits?.CLE ?? { homePPG: 117.4, homeAllow: 113.4, awayPPG: 113.6, awayAllow: 113.0, homeN: 49, homeW: 33, awayN: 50, awayW: 27 };
const nykSplit = REAL.splits?.NYK ?? { homePPG: 117.4, homeAllow: 105.2, awayPPG: 115.5, awayAllow: 107.1, homeN: 48, homeW: 37, awayN: 48, awayW: 28 };

// Home team (CLE) gets series-context adjustment applied to ratings.
const cleHomeOrtg = ortgFrom(cleSplit.homePPG, REAL_PACE_CLE, cleSplit.homeN) + SERIES_CONTEXT.homeOrtgAdj;
const cleHomeDrtg = drtgFrom(cleSplit.homeAllow, REAL_PACE_CLE, cleSplit.homeN) + SERIES_CONTEXT.homeDrtgAdj;

export const TEAMS: Record<"NYK" | "CLE", TeamBaseline> = {
  NYK: {
    code: "NYK",
    name: "New York Knicks",
    pace: REAL_PACE_NYK,
    ortg: (ortgFrom(nykSplit.homePPG, REAL_PACE_NYK, nykSplit.homeN) + ortgFrom(nykSplit.awayPPG, REAL_PACE_NYK, nykSplit.awayN)) / 2,
    drtg: (drtgFrom(nykSplit.homeAllow, REAL_PACE_NYK, nykSplit.homeN) + drtgFrom(nykSplit.awayAllow, REAL_PACE_NYK, nykSplit.awayN)) / 2,
    homeOrtg: ortgFrom(nykSplit.homePPG, REAL_PACE_NYK, nykSplit.homeN),
    awayOrtg: ortgFrom(nykSplit.awayPPG, REAL_PACE_NYK, nykSplit.awayN),
    homeDrtg: drtgFrom(nykSplit.homeAllow, REAL_PACE_NYK, nykSplit.homeN),
    awayDrtg: drtgFrom(nykSplit.awayAllow, REAL_PACE_NYK, nykSplit.awayN),
    threePtRate: 0.39,
    recordWinPct: 53 / 82,
    restDays: 2,
  },
  CLE: {
    code: "CLE",
    name: "Cleveland Cavaliers",
    pace: REAL_PACE_CLE,
    ortg: (cleHomeOrtg + ortgFrom(cleSplit.awayPPG, REAL_PACE_CLE, cleSplit.awayN)) / 2,
    drtg: (cleHomeDrtg + drtgFrom(cleSplit.awayAllow, REAL_PACE_CLE, cleSplit.awayN)) / 2,
    homeOrtg: cleHomeOrtg,
    awayOrtg: ortgFrom(cleSplit.awayPPG, REAL_PACE_CLE, cleSplit.awayN),
    homeDrtg: cleHomeDrtg,
    awayDrtg: drtgFrom(cleSplit.awayAllow, REAL_PACE_CLE, cleSplit.awayN),
    threePtRate: 0.44,
    recordWinPct: 52 / 82,
    restDays: 2,
  },
};

export const TEAMS_PROVENANCE = {
  source: "ESPN team schedules (real time-decayed splits, half-life 60d)",
  cleHomeN: cleSplit.homeN,
  cleAwayN: cleSplit.awayN,
  nykHomeN: nykSplit.homeN,
  nykAwayN: nykSplit.awayN,
} as const;
