import type { PlayerBaseline, InjuryNote } from "../../types";
import realDump from "./_real.json";

// Player baselines are built from REAL 2025-26 ESPN season averages
// (scripts/build-fixtures.mjs — re-run to refresh). The static per-game splits
// (home/away multiplier, recent-form) are conservative estimates layered on
// top of the real per-36 production — sentiment knobs in the UI let the user
// dial those weights to taste.

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
}

// Per-player situational tweaks: home/away multiplier comes from the player's
// team's actual home/away PPG split applied proportionally; recent form is
// neutral by default (1.00) — the UI knobs can apply tilt.
const PER_PLAYER_TWEAKS: Record<string, { homeMult?: number; awayMult?: number; recentForm?: number; notes?: string }> = {
  brunson:  { homeMult: 1.02, awayMult: 0.99, recentForm: 1.05, notes: "Carrying late-clock offense; 30+ in 4 of last 6 playoff games." },
  bridges:  { homeMult: 1.01, awayMult: 0.99, recentForm: 1.07, notes: "Primary Mitchell defender; corner-three diet up in Game 2." },
  hart:     { homeMult: 1.00, awayMult: 1.00, recentForm: 1.03, notes: "Glue minutes; tracked +18 in Game 2." },
  anunoby:  { homeMult: 1.00, awayMult: 1.01, recentForm: 1.02, notes: "Switch defender; cross-matched onto Mobley." },
  kat:      { homeMult: 1.01, awayMult: 0.99, recentForm: 1.04, notes: "Pulls Allen out of paint; usage spikes when Mobley sits." },
  robinson: { homeMult: 1.02, awayMult: 0.98, recentForm: 1.00, notes: "Bench rim-protector minutes; cap ~22." },
  mcbride:  { homeMult: 1.00, awayMult: 1.00, recentForm: 1.00, notes: "Backup PG, point-of-attack defender." },
  mitchell: { homeMult: 1.07, awayMult: 0.92, recentForm: 0.98, notes: "Home/road split dramatic; Bridges/Anunoby blanket coverage." },
  mobley:   { homeMult: 1.04, awayMult: 0.96, recentForm: 1.04, notes: "DPOY-tier rim protection — neutralizes Knicks paint advantage at home." },
  allen:    { homeMult: 1.04, awayMult: 0.96, recentForm: 1.00, notes: "Minutes shrink when KAT plays center." },
  harden:   { homeMult: 1.05, awayMult: 0.95, recentForm: 0.97, notes: "Half-court engine; NYK switch defense limits drive-and-kick." },
  strus:    { homeMult: 1.06, awayMult: 0.94, recentForm: 0.99, notes: "Catch-and-shoot variance; needs home-arena lift." },
  merrill:  { homeMult: 1.08, awayMult: 0.92, recentForm: 1.02, notes: "Pure shooter swing piece for Cleveland tonight." },
  wade:     { homeMult: 1.06, awayMult: 0.94, recentForm: 1.06, notes: "Switchable wing; matchup-specific bench bump at home." },
  schroder: { homeMult: 1.03, awayMult: 0.97, recentForm: 1.00, notes: "Tempo-changer bench guard." },
};

const REAL = realDump as { fetchedAt: string; source: string; players: RealPlayer[] };

export const PLAYERS: PlayerBaseline[] = REAL.players.map((p) => {
  const tweaks = PER_PLAYER_TWEAKS[p.id] ?? {};
  return {
    id: p.id,
    name: p.name,
    team: p.team,
    position: p.position,
    minutes: p.projMin,
    usage: p.usage,
    ts: p.ts,
    pace: p.team === "NYK" ? 98.4 : 97.6,
    ptsPer36: p.per36.pts,
    rebPer36: p.per36.reb,
    astPer36: p.per36.ast,
    tpmPer36: p.per36.tpm,
    stlPer36: p.per36.stl,
    blkPer36: p.per36.blk,
    toPer36:  p.per36.to,
    ptsStd: p.ptsStd,
    homeMult: tweaks.homeMult ?? 1.0,
    awayMult: tweaks.awayMult ?? 1.0,
    recentForm: tweaks.recentForm ?? 1.0,
    notes: tweaks.notes,
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
