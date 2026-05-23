import type { PlayerBaseline, InjuryNote } from "../../types";
import realDump from "./_real.json";

// Player baselines are built from REAL 2025-26 ESPN season averages
// (scripts/build-fixtures.mjs — re-run to refresh). The static per-game splits
// (home/away multiplier, recent-form) are conservative estimates layered on
// top of the real per-36 production — sentiment knobs in the UI let the user
// dial those weights to taste.

interface RealSplit {
  n: number;
  homeN: number;
  awayN: number;
  seasonAvgPts: number;
  seasonStdPts: number;
  homePts: number;
  awayPts: number;
  homeMult: number;
  awayMult: number;
  last5Avg: number;
  recentForm: number;
}

interface RealPlayer {
  id: string;
  espnId: number;
  name: string;
  team: "NYK" | "CLE";
  position: string;
  seasonMin: number;
  projMin: number;
  usage: number;
  ts: number;
  per36: { pts: number; reb: number; ast: number; tpm: number; stl: number; blk: number; to: number };
  ptsStd: number;
  starter: boolean;
  split: RealSplit | null;
}

// Player notes layered on top of real measured splits — narrative only,
// no math impact (the actual multipliers below come from real game logs).
const PER_PLAYER_NOTES: Record<string, string> = {
  brunson:  "Carrying late-clock offense; cooled L5 (real split shows form dip).",
  bridges:  "Primary Mitchell defender; real split shows higher road scoring.",
  hart:     "Glue minutes; +18 in Game 2; real L5 cold streak (8.6 PPG).",
  anunoby:  "Real split shows trending up: L5 18.6 PPG, slightly higher on road.",
  kat:      "Pulls Allen out of paint; small but real home tilt.",
  robinson: "Bench rim-protector; small real-split home bump.",
  mcbride:  "Backup PG, real split shows L5 cold (8.0 PPG).",
  mitchell: "REAL DATA: home/road PPG nearly identical (27.5/27.0); home-only narrative overstated.",
  mobley:   "DPOY-tier rim protection; real L5 form dip (14.8).",
  allen:    "REAL DATA: actually scores MORE on the road (16.9 vs 13.4).",
  harden:   "REAL DATA: scores more on the road (25.1 vs 21.9). Inverts home-bias prior.",
  strus:    "REAL DATA: huge real home boost (14.3 vs 8.0) on small sample (n=12).",
  merrill:  "Real split: slight road tilt. L5 form cold (9.8 PPG).",
  wade:     "Real split: clear home tilt (6.6 vs 5.2). L5 cold (4.0 PPG).",
  schroder: "REAL DATA: scores more on the road (11.8 vs 9.6).",
};

const REAL = realDump as {
  fetchedAt: string;
  source: string;
  players: RealPlayer[];
  pace?: { NYK?: number | null; CLE?: number | null };
};

export const PLAYERS: PlayerBaseline[] = REAL.players.map((p) => {
  // Use REAL measured home/away multipliers from the player's game log when
  // available. Falls back to neutral 1.0 if no game-log data was pulled.
  const homeMult = p.split?.homeMult ?? 1.0;
  const awayMult = p.split?.awayMult ?? 1.0;
  const recentForm = p.split?.recentForm ?? 1.0;
  return {
    id: p.id,
    name: p.name,
    team: p.team,
    position: p.position,
    minutes: p.projMin,
    usage: p.usage,
    ts: p.ts,
    pace: (p.team === "NYK" ? REAL.pace?.NYK : REAL.pace?.CLE) ?? (p.team === "NYK" ? 98.4 : 97.6),
    ptsPer36: p.per36.pts,
    rebPer36: p.per36.reb,
    astPer36: p.per36.ast,
    tpmPer36: p.per36.tpm,
    stlPer36: p.per36.stl,
    blkPer36: p.per36.blk,
    toPer36:  p.per36.to,
    ptsStd: p.ptsStd,
    homeMult,
    awayMult,
    recentForm,
    notes: PER_PLAYER_NOTES[p.id],
  };
});

// Real provenance metadata (used to label the UI)
export const PLAYERS_PROVENANCE = {
  source: REAL.source,
  fetchedAt: REAL.fetchedAt,
  count: REAL.players.length,
} as const;

// Injuries are not in the public ESPN endpoints we use here; they're stubs.
// The /api/injuries route can replace these with live data when wired up.
export const INJURIES: InjuryNote[] = [
  {
    player: "Caris LeVert",
    team: "CLE",
    status: "QUESTIONABLE",
    note: "Right ankle sprain — game-time decision.",
    minutesImpact: -6,
  },
];
