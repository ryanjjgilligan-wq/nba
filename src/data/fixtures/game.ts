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

export const GAME: GameContext = {
  id: "2026-ECF-G3-NYK-CLE",
  tipoffISO: REAL.odds?.tipoffISO ?? "2026-05-23T20:00:00-04:00",
  venue: REAL.odds?.venue ?? "Rocket Arena, Cleveland",
  homeTeam: "CLE",
  awayTeam: "NYK",
  seriesText: "2026 ECF — Knicks lead 2-0 — Cavaliers must-win Game 3",
  refCrew: ["Scott Foster", "Marc Davis", "Tony Brothers"],
  travelDays: 1,
  notes: [
    `NYK season: ${REAL.odds?.awayRecord ?? "53-29"} · CLE season: ${REAL.odds?.homeRecord ?? "52-30"}.`,
    `CLE playoff home: ${REAL.splits?.CLE?.homeW ?? 6}-${(REAL.splits?.CLE?.homeN ?? 7) - (REAL.splits?.CLE?.homeW ?? 6)}, ${(REAL.splits?.CLE?.homePPG ?? 114.6).toFixed(1)} PPG.`,
    `CLE playoff road: ${REAL.splits?.CLE?.awayW ?? 2}-${(REAL.splits?.CLE?.awayN ?? 9) - (REAL.splits?.CLE?.awayW ?? 2)}, ${(REAL.splits?.CLE?.awayPPG ?? 104.4).toFixed(1)} PPG. Home/road delta: ${((REAL.splits?.CLE?.homePPG ?? 114.6) - (REAL.splits?.CLE?.awayPPG ?? 104.4)).toFixed(1)} pts.`,
    `NYK playoff overall: ${(REAL.splits?.NYK?.homeW ?? 0) + (REAL.splits?.NYK?.awayW ?? 0)}-${((REAL.splits?.NYK?.homeN ?? 0) + (REAL.splits?.NYK?.awayN ?? 0)) - ((REAL.splits?.NYK?.homeW ?? 0) + (REAL.splits?.NYK?.awayW ?? 0))}, scoring ${(REAL.splits?.NYK?.homePPG ?? 116.3).toFixed(1)} home / ${(REAL.splits?.NYK?.awayPPG ?? 122.8).toFixed(1)} away.`,
    "Knicks Game 2 starters posted +27.7 net rating; +18 in the paint, 32 assists.",
    "Cleveland blew a 22-point Game 2 lead — fuel-or-scar narrative is live.",
    "Mike Brown coaching for NYK; timeout-management edge has tracked all postseason.",
  ],
};

// Team-level baselines derived from REAL home/away splits and REAL pace
// (sampled team box scores → average possessions per game).
const REAL_PACE_NYK = REAL.pace?.NYK ?? 98.4;
const REAL_PACE_CLE = REAL.pace?.CLE ?? 97.6;

function ortgFrom(ppg: number, pace: number) { return (ppg / pace) * 100; }
function drtgFrom(allow: number, pace: number) { return (allow / pace) * 100; }

const cleSplit = REAL.splits?.CLE ?? { homePPG: 114.6, homeAllow: 109.6, awayPPG: 104.4, awayAllow: 108.9, homeN: 7, homeW: 6, awayN: 9, awayW: 2 };
const nykSplit = REAL.splits?.NYK ?? { homePPG: 116.3, homeAllow: 100.4, awayPPG: 122.8, awayAllow: 100.8, homeN: 7, homeW: 6, awayN: 5, awayW: 4 };

export const TEAMS: Record<"NYK" | "CLE", TeamBaseline> = {
  NYK: {
    code: "NYK",
    name: "New York Knicks",
    pace: REAL_PACE_NYK,
    ortg: (ortgFrom(nykSplit.homePPG, REAL_PACE_NYK) + ortgFrom(nykSplit.awayPPG, REAL_PACE_NYK)) / 2,
    drtg: (drtgFrom(nykSplit.homeAllow, REAL_PACE_NYK) + drtgFrom(nykSplit.awayAllow, REAL_PACE_NYK)) / 2,
    homeOrtg: ortgFrom(nykSplit.homePPG, REAL_PACE_NYK),
    awayOrtg: ortgFrom(nykSplit.awayPPG, REAL_PACE_NYK),
    homeDrtg: drtgFrom(nykSplit.homeAllow, REAL_PACE_NYK),
    awayDrtg: drtgFrom(nykSplit.awayAllow, REAL_PACE_NYK),
    threePtRate: 0.39,
    recordWinPct: 53 / 82,
    restDays: 2,
  },
  CLE: {
    code: "CLE",
    name: "Cleveland Cavaliers",
    pace: REAL_PACE_CLE,
    ortg: (ortgFrom(cleSplit.homePPG, REAL_PACE_CLE) + ortgFrom(cleSplit.awayPPG, REAL_PACE_CLE)) / 2,
    drtg: (drtgFrom(cleSplit.homeAllow, REAL_PACE_CLE) + drtgFrom(cleSplit.awayAllow, REAL_PACE_CLE)) / 2,
    homeOrtg: ortgFrom(cleSplit.homePPG, REAL_PACE_CLE),
    awayOrtg: ortgFrom(cleSplit.awayPPG, REAL_PACE_CLE),
    homeDrtg: drtgFrom(cleSplit.homeAllow, REAL_PACE_CLE),
    awayDrtg: drtgFrom(cleSplit.awayAllow, REAL_PACE_CLE),
    threePtRate: 0.44,
    recordWinPct: 52 / 82,
    restDays: 2,
  },
};

export const TEAMS_PROVENANCE = {
  source: "ESPN team schedules (real playoff scores aggregated)",
  cleHomeN: cleSplit.homeN,
  cleAwayN: cleSplit.awayN,
  nykHomeN: nykSplit.homeN,
  nykAwayN: nykSplit.awayN,
} as const;
