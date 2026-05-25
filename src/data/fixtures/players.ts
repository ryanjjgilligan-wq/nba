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
  restB2B: { n: number; avgPts: number; mult: number };
  rest1Day: { n: number; avgPts: number; mult: number };
  rest2Plus: { n: number; avgPts: number; mult: number };
  vsOpponent: { n: number; avgPts: number; avgReb: number; avgAst: number; mult: number };
  playoff: { n: number; avgMin: number; avgPts: number };
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
  // NYK
  brunson:  "Carrying late-clock offense; minutes load up in road must-wins.",
  bridges:  "Primary Mitchell defender; real split shows higher road scoring.",
  hart:     "Glue minutes; rebound-rate spikes vs CLE bigs all series.",
  anunoby:  "Real split shows trending up: cross-matches onto Mobley.",
  kat:      "Pulls Allen out of paint; small but real road tilt this matchup.",
  robinson: "Bench rim-protector; minutes hinge on KAT foul state.",
  mcbride:  "Backup PG, point-of-attack defender on Harden.",
  // CLE
  mitchell: "REAL DATA: home/road PPG nearly identical; volume-shooter target tonight.",
  mobley:   "DPOY-tier rim protection; opponent-history mult drags scoring vs NYK.",
  allen:    "REAL DATA: actually scores MORE on the road; lower-volume at home.",
  harden:   "REAL DATA: scores more on the road. NYK pressure forces TO.",
  strus:    "REAL DATA: huge real home boost (catch-and-shoot variance).",
  merrill:  "Pure shooter; sample-size noisy but a real swing piece.",
  wade:     "Real split: clear home tilt; matchup-specific bench bump.",
  schroder: "REAL DATA: scores more on the road; tempo-changer minutes.",
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
    // NEW REAL features
    vsOpponentMult: p.split?.vsOpponent.mult ?? 1.0,
    vsOpponentN: p.split?.vsOpponent.n ?? 0,
    vsOpponentPPG: p.split?.vsOpponent.avgPts ?? 0,
    restB2BMult: p.split?.restB2B.mult ?? 1.0,
    rest1Mult: p.split?.rest1Day.mult ?? 1.0,
    rest2PlusMult: p.split?.rest2Plus.mult ?? 1.0,
    playoffMin: p.split?.playoff.avgMin ?? 0,
    playoffPpg: p.split?.playoff.avgPts ?? 0,
    playoffN: p.split?.playoff.n ?? 0,
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
export const INJURIES: InjuryNote[] = [];
