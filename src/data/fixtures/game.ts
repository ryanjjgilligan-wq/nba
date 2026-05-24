import type { GameContext, TeamBaseline } from "../../types";
import realDump from "./_real.json";

interface RealSplits {
  homeN: number; homeW: number; homePPG: number; homeAllow: number;
  awayN: number; awayW: number; awayPPG: number; awayAllow: number;
}

const REAL = realDump as {
  splits?: { NYK?: RealSplits; CLE?: RealSplits };
  pace?: { NYK?: number | null; CLE?: number | null };
  odds?: { tipoffISO?: string; venue?: string; gameId?: string; homeRecord?: string; awayRecord?: string };
};

// NYK = OKC (away), CLE = SAS (home) — internal codes preserved, display swapped.
export const GAME: GameContext = {
  id: "2026-WCF-G3-OKC-SAS",
  tipoffISO: REAL.odds?.tipoffISO ?? "2026-05-24T20:00:00-05:00",
  venue: REAL.odds?.venue ?? "Frost Bank Center, San Antonio",
  homeTeam: "CLE", // = SAS
  awayTeam: "NYK", // = OKC
  seriesText: "2026 WCF — Spurs lead 2-1 — Thunder must rebound on the road",
  refCrew: ["Scott Foster", "James Capers", "Eric Lewis"],
  travelDays: 1,
  notes: [
    `OKC season: ${REAL.odds?.awayRecord ?? "64-18"} · SAS season: ${REAL.odds?.homeRecord ?? "62-20"}.`,
    `OKC playoff road: ${REAL.splits?.NYK?.awayW ?? 5}-${(REAL.splits?.NYK?.awayN ?? 5) - (REAL.splits?.NYK?.awayW ?? 5)}, ${(REAL.splits?.NYK?.awayPPG ?? 124.2).toFixed(1)} PPG — the league's best road team this postseason.`,
    `SAS playoff home: ${REAL.splits?.CLE?.homeW ?? 4}-${(REAL.splits?.CLE?.homeN ?? 7) - (REAL.splits?.CLE?.homeW ?? 4)}, ${(REAL.splits?.CLE?.homePPG ?? 113.9).toFixed(1)} PPG; defense allows ${(REAL.splits?.CLE?.homeAllow ?? 102.6).toFixed(1)}.`,
    "Wemby anchoring an interior wall that's swung this series — 3.7 BLK/G in the playoffs.",
    "SGA / Wemby = ~50% of combined usage. Single-MVP collisions decide possessions.",
    "Castle has been the X-factor at home — usage spikes ~5% in front of San Antonio.",
  ],
};

const REAL_PACE_NYK = REAL.pace?.NYK ?? 99.6;
const REAL_PACE_CLE = REAL.pace?.CLE ?? 102.4;

// League-average baselines (2024-25 NBA, holds well for 2025-26)
const LEAGUE_ORTG = 114.5;
const LEAGUE_DRTG = 114.5;

// Bayesian shrinkage: `(n × observed + k × prior) / (n + k)`. With k=12,
// a team needs ~12 home games before its split deviates meaningfully from
// the league mean. Standard PECOTA/Marcel-style shrinkage. Prevents the
// 7-game-postseason sample from acting like ground truth.
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

const sasSplit = REAL.splits?.CLE ?? { homePPG: 113.9, homeAllow: 102.6, awayPPG: 118.9, awayAllow: 109.9, homeN: 7, homeW: 4, awayN: 7, awayW: 5 };
const okcSplit = REAL.splits?.NYK ?? { homePPG: 118.2, homeAllow: 103.8, awayPPG: 124.2, awayAllow: 111.4, homeN: 6, homeW: 5, awayN: 5, awayW: 5 };

export const TEAMS: Record<"NYK" | "CLE", TeamBaseline> = {
  NYK: { // OKC
    code: "NYK",
    name: "Oklahoma City Thunder",
    pace: REAL_PACE_NYK,
    ortg: (ortgFrom(okcSplit.homePPG, REAL_PACE_NYK, okcSplit.homeN) + ortgFrom(okcSplit.awayPPG, REAL_PACE_NYK, okcSplit.awayN)) / 2,
    drtg: (drtgFrom(okcSplit.homeAllow, REAL_PACE_NYK, okcSplit.homeN) + drtgFrom(okcSplit.awayAllow, REAL_PACE_NYK, okcSplit.awayN)) / 2,
    homeOrtg: ortgFrom(okcSplit.homePPG, REAL_PACE_NYK, okcSplit.homeN),
    awayOrtg: ortgFrom(okcSplit.awayPPG, REAL_PACE_NYK, okcSplit.awayN),
    homeDrtg: drtgFrom(okcSplit.homeAllow, REAL_PACE_NYK, okcSplit.homeN),
    awayDrtg: drtgFrom(okcSplit.awayAllow, REAL_PACE_NYK, okcSplit.awayN),
    threePtRate: 0.39,
    recordWinPct: 64 / 82,
    restDays: 2,
  },
  CLE: { // SAS
    code: "CLE",
    name: "San Antonio Spurs",
    pace: REAL_PACE_CLE,
    ortg: (ortgFrom(sasSplit.homePPG, REAL_PACE_CLE, sasSplit.homeN) + ortgFrom(sasSplit.awayPPG, REAL_PACE_CLE, sasSplit.awayN)) / 2,
    drtg: (drtgFrom(sasSplit.homeAllow, REAL_PACE_CLE, sasSplit.homeN) + drtgFrom(sasSplit.awayAllow, REAL_PACE_CLE, sasSplit.awayN)) / 2,
    homeOrtg: ortgFrom(sasSplit.homePPG, REAL_PACE_CLE, sasSplit.homeN),
    awayOrtg: ortgFrom(sasSplit.awayPPG, REAL_PACE_CLE, sasSplit.awayN),
    homeDrtg: drtgFrom(sasSplit.homeAllow, REAL_PACE_CLE, sasSplit.homeN),
    awayDrtg: drtgFrom(sasSplit.awayAllow, REAL_PACE_CLE, sasSplit.awayN),
    threePtRate: 0.40,
    recordWinPct: 62 / 82,
    restDays: 2,
  },
};

export const TEAMS_PROVENANCE = {
  source: "ESPN team schedules (real playoff scores aggregated)",
  cleHomeN: sasSplit.homeN,
  cleAwayN: sasSplit.awayN,
  nykHomeN: okcSplit.homeN,
  nykAwayN: okcSplit.awayN,
} as const;
