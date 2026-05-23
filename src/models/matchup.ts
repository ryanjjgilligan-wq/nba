import type { PlayerBaseline, TeamBaseline } from "../types";

// Defense-vs-position multipliers tuned from this series so far. CLE's interior
// D (Mobley + Allen) gives them a meaningful negative multiplier vs opposing
// bigs at home; NYK perimeter defense (Bridges/Anunoby) hurts CLE guards.

const DEF_VS_POS_AT_HOME: Record<string, Partial<Record<string, number>>> = {
  // Defending team -> opposing position -> pts multiplier
  CLE: { PG: 0.97, SG: 0.95, SF: 0.99, "G/F": 0.98, PF: 0.93, C: 0.91 },
  NYK: { PG: 0.94, SG: 0.93, SF: 0.97, "G/F": 0.97, PF: 0.99, C: 1.00 },
};

const DEF_VS_POS_AT_AWAY: Record<string, Partial<Record<string, number>>> = {
  CLE: { PG: 1.02, SG: 1.04, SF: 1.02, "G/F": 1.01, PF: 1.00, C: 0.99 },
  NYK: { PG: 0.96, SG: 0.95, SF: 0.97, "G/F": 0.98, PF: 1.00, C: 1.01 },
};

// Individual defender matchups for Game 3 (built from rotations + series film).
// Negative = projection drag, positive = projection lift.
export const DEFENDER_MATCHUPS: Array<{
  scorer: string;
  primaryDefender: string;
  impact: number;
  note: string;
}> = [
  {
    scorer: "Donovan Mitchell",
    primaryDefender: "Mikal Bridges",
    impact: -0.05,
    note: "Bridges held Mitchell to 5/15 FG cumulatively across Games 1–2; switch onto Anunoby further drags TS%.",
  },
  {
    scorer: "Jalen Brunson",
    primaryDefender: "Sam Merrill / Garland",
    impact: +0.04,
    note: "Cleveland has no PoA stopper for Brunson; ICE coverage left him paint touches in Game 2.",
  },
  {
    scorer: "Karl-Anthony Towns",
    primaryDefender: "Mobley/Allen",
    impact: -0.03,
    note: "Mobley shrinks KAT's rim conversion; he's still net-positive but capped vs DPOY-tier.",
  },
  {
    scorer: "Evan Mobley",
    primaryDefender: "OG Anunoby + Towns help",
    impact: -0.02,
    note: "Anunoby switches keep Mobley from face-up post; usage holds, efficiency dips.",
  },
  {
    scorer: "Darius Garland",
    primaryDefender: "Brunson/Bridges blitz",
    impact: -0.06,
    note: "Aggressive PnR coverage forced 4 TO in Game 2; same script likely.",
  },
  {
    scorer: "Mikal Bridges",
    primaryDefender: "Strus/Wade",
    impact: +0.03,
    note: "Smaller wings get hunted off the ball; corner-three diet stays elevated.",
  },
  {
    scorer: "OG Anunoby",
    primaryDefender: "Strus/Hunter",
    impact: +0.02,
    note: "Mismatch hunter when CLE goes 3-guard.",
  },
  {
    scorer: "Sam Merrill",
    primaryDefender: "Bridges chase",
    impact: -0.04,
    note: "Top-side denial limits clean catch-and-shoot looks.",
  },
];

export function matchupMultiplier(
  p: PlayerBaseline,
  homeTeam: "NYK" | "CLE",
): { mult: number; sources: string[] } {
  const isHome = p.team === homeTeam;
  const defending = p.team === "NYK" ? "CLE" : "NYK";
  const dvpTable = isHome ? DEF_VS_POS_AT_AWAY[defending] : DEF_VS_POS_AT_HOME[defending];
  const dvp = (dvpTable?.[p.position] ?? 1.0) as number;
  const individual = DEFENDER_MATCHUPS.find((m) => m.scorer === p.name);
  const indiv = individual ? 1 + individual.impact : 1.0;
  const sources: string[] = [];
  if (dvp !== 1) sources.push(`DvP ${defending} vs ${p.position}: x${dvp.toFixed(2)}`);
  if (individual) sources.push(`Defender ${individual.primaryDefender}: x${indiv.toFixed(2)}`);
  return { mult: dvp * indiv, sources };
}

export function venueMultiplier(p: PlayerBaseline, homeTeam: "NYK" | "CLE"): number {
  return p.team === homeTeam ? p.homeMult : p.awayMult;
}

export function paceMultiplier(p: PlayerBaseline, teams: Record<"NYK" | "CLE", TeamBaseline>): number {
  const opp = p.team === "NYK" ? "CLE" : "NYK";
  const ownPace = teams[p.team].pace;
  const oppPace = teams[opp].pace;
  const gamePace = (ownPace + oppPace) / 2;
  return gamePace / ownPace;
}
