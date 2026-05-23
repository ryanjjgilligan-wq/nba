import type { GameContext, TeamBaseline } from "../../types";
import realDump from "./_real.json";

interface RealSplits {
  homeN: number; homeW: number; homePPG: number; homeAllow: number;
  awayN: number; awayW: number; awayPPG: number; awayAllow: number;
}

const REAL = realDump as {
  splits?: { NYK?: RealSplits; CLE?: RealSplits };
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

// Team-level baselines derived from REAL home/away splits. ORtg is approximated
// as PPG / pace × 100; pace estimated at 98 league-typical (a refinement would
// pull per-team possession counts directly).
const PACE = 98;
function ortgFrom(ppg: number) { return (ppg / PACE) * 100; }
function drtgFrom(allow: number) { return (allow / PACE) * 100; }

const cleSplit = REAL.splits?.CLE ?? { homePPG: 114.6, homeAllow: 109.6, awayPPG: 104.4, awayAllow: 108.9, homeN: 7, homeW: 6, awayN: 9, awayW: 2 };
const nykSplit = REAL.splits?.NYK ?? { homePPG: 116.3, homeAllow: 100.4, awayPPG: 122.8, awayAllow: 100.8, homeN: 7, homeW: 6, awayN: 5, awayW: 4 };

export const TEAMS: Record<"NYK" | "CLE", TeamBaseline> = {
  NYK: {
    code: "NYK",
    name: "New York Knicks",
    pace: 98.4,
    ortg: (ortgFrom(nykSplit.homePPG) + ortgFrom(nykSplit.awayPPG)) / 2,
    drtg: (drtgFrom(nykSplit.homeAllow) + drtgFrom(nykSplit.awayAllow)) / 2,
    homeOrtg: ortgFrom(nykSplit.homePPG),
    awayOrtg: ortgFrom(nykSplit.awayPPG),
    homeDrtg: drtgFrom(nykSplit.homeAllow),
    awayDrtg: drtgFrom(nykSplit.awayAllow),
    threePtRate: 0.39,
    recordWinPct: 53 / 82,
    restDays: 2,
  },
  CLE: {
    code: "CLE",
    name: "Cleveland Cavaliers",
    pace: 97.6,
    ortg: (ortgFrom(cleSplit.homePPG) + ortgFrom(cleSplit.awayPPG)) / 2,
    drtg: (drtgFrom(cleSplit.homeAllow) + drtgFrom(cleSplit.awayAllow)) / 2,
    homeOrtg: ortgFrom(cleSplit.homePPG),
    awayOrtg: ortgFrom(cleSplit.awayPPG),
    homeDrtg: drtgFrom(cleSplit.homeAllow),
    awayDrtg: drtgFrom(cleSplit.awayAllow),
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
