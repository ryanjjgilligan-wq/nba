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

// Individual defender priors for OKC @ SAS. Used as FALLBACK only — when a
// player has ≥3 real games of head-to-head history against the opposing team,
// the opponent-specific multiplier overrides these.
export const DEFENDER_MATCHUPS: Array<{
  scorer: string;
  primaryDefender: string;
  impact: number;
  note: string;
}> = [
  {
    scorer: "Shai Gilgeous-Alexander",
    primaryDefender: "Stephon Castle / Wemby help",
    impact: -0.03,
    note: "Castle PoA + Wemby rim-protection caps his drive efficiency.",
  },
  {
    scorer: "Victor Wembanyama",
    primaryDefender: "Holmgren switches",
    impact: -0.02,
    note: "Chet length contests but Wemby's range neutralizes most help.",
  },
  {
    scorer: "De'Aaron Fox",
    primaryDefender: "Wallace/Caruso",
    impact: -0.04,
    note: "OKC's elite PoA shrinks paint touches; pull-up volume up.",
  },
  {
    scorer: "Jalen Williams",
    primaryDefender: "Vassell/Castle",
    impact: -0.02,
    note: "Two switchable wings; gets fewer mismatches than usual.",
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
