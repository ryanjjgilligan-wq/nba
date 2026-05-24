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
  // OKC
  sga:         "MVP-tier usage; 30+ in every road game this postseason. Wemby challenges every rim attempt.",
  jdub:        "Jalen Williams — secondary creator; matchup with Vassell/Castle is the swing.",
  chet:        "Real H2H drops his PPG vs Wemby — long-armed defender shrinks his rim diet.",
  dort:        "Catch-and-shoot specialist + Fox primary defender — opportunity cost in his offense.",
  wallace:     "Pestering on-ball guard; minutes spike when Fox heats up.",
  hartenstein: "Backup C minutes shrink against Wemby switchability.",
  caruso:      "Plus-defender, off-ball cuts; foul-prone in postseason.",
  wiggins:     "Three-point variance off the bench.",
  joe:         "Pure shooter; tiny floor, high ceiling on hot nights.",
  // SAS
  wemby:       "DPOY favorite + 27 PPG home; the gravitational center of every SAS possession.",
  fox:         "Pace-changer in transition; matchup with Wallace/Caruso is grueling.",
  vassell:     "Two-way wing; absorbs Caruso when on the floor.",
  castle:      "Real split shows usage spike at home — primary secondary creator.",
  kjohnson:    "Streaky scorer; H2H against OKC has been quiet.",
  harper:      "Rookie spark off the bench; high variance.",
  champagnie:  "Switchable wing; matchup-specific minutes.",
  barnes:      "Veteran spot-up minutes when SAS needs spacing.",
  kornet:      "Specialist big when Wemby sits.",
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
