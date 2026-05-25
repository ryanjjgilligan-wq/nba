import type { PlayerBaseline, TeamBaseline } from "../types";
import { DVP_BY_TEAM } from "../data/fixtures/game";

// REAL DvP from box scores (pulled by build-fixtures.mjs). For each team
// we have PTS allowed per opposing position, averaged across sampled games.
// We convert to a MULTIPLIER vs league average by dividing by the league
// baseline for that position. League per-game team-totals by opposing
// position (rough 2024-25 NBA averages):
const LEAGUE_DVP_BASELINE: Record<string, number> = {
  PG: 40, SG: 50, SF: 40, PF: 30, C: 20, G: 50, F: 40,
};

function buildDvpMultipliers(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const team of ["NYK", "CLE"] as const) {
    out[team] = {};
    const teamDvp = DVP_BY_TEAM[team] || {};
    for (const [pos, ptsAllowed] of Object.entries(teamDvp)) {
      const baseline = LEAGUE_DVP_BASELINE[pos];
      if (!baseline) continue;
      // Higher pts allowed → worse defense → bigger multiplier on offense
      const raw = ptsAllowed / baseline;
      // Clamp to [0.80, 1.20] — DvP is noisy on per-position samples
      out[team][pos] = Math.max(0.80, Math.min(1.20, raw));
    }
  }
  return out;
}
const REAL_DVP_MULT = buildDvpMultipliers();

// Static fallback prior — only used when a position has no real DvP data.
const DEF_VS_POS_FALLBACK: Record<string, Partial<Record<string, number>>> = {
  CLE: { PG: 0.97, SG: 0.95, SF: 0.99, "G/F": 0.98, PF: 0.93, C: 0.91 },
  NYK: { PG: 0.94, SG: 0.93, SF: 0.97, "G/F": 0.97, PF: 0.99, C: 1.00 },
};

// Individual defender priors for NYK @ CLE Game 4. Used as FALLBACK only —
// when a player has ≥3 real games of head-to-head history against the
// opposing team, the opponent-specific multiplier overrides these.
export const DEFENDER_MATCHUPS: Array<{
  scorer: string;
  primaryDefender: string;
  impact: number;
  note: string;
}> = [
  {
    scorer: "Donovan Mitchell",
    primaryDefender: "Mikal Bridges + Anunoby help",
    impact: -0.05,
    note: "Bridges has held Mitchell to capped efficiency across the series; switches onto Anunoby further drag.",
  },
  {
    scorer: "Jalen Brunson",
    primaryDefender: "Merrill / Schroder",
    impact: +0.04,
    note: "Cleveland lacks a PoA stopper for Brunson; he gets paint touches.",
  },
  {
    scorer: "Karl-Anthony Towns",
    primaryDefender: "Mobley + Allen",
    impact: -0.03,
    note: "Mobley shrinks KAT rim conversion; usage holds, efficiency dips.",
  },
  {
    scorer: "Evan Mobley",
    primaryDefender: "Anunoby switches + Towns help",
    impact: -0.02,
    note: "Anunoby switches prevent face-up post; Wade-vs-KAT lineup shifts also restrict touches.",
  },
  {
    scorer: "James Harden",
    primaryDefender: "Brunson / Bridges PnR pressure",
    impact: -0.05,
    note: "Aggressive blitz on Harden PnR has forced TOs all series — same script likely.",
  },
];

export function matchupMultiplier(
  p: PlayerBaseline,
  homeTeam: "NYK" | "CLE",
): { mult: number; sources: string[] } {
  const defending = p.team === "NYK" ? "CLE" : "NYK";
  // Prefer REAL DvP from box scores; fall back to synthetic table.
  let dvp = REAL_DVP_MULT[defending]?.[p.position];
  let dvpSource = "real DvP from box scores";
  if (dvp == null) {
    const fb = DEF_VS_POS_FALLBACK[defending];
    dvp = (fb?.[p.position] ?? 1.0);
    dvpSource = "fallback prior";
  }
  const individual = DEFENDER_MATCHUPS.find((m) => m.scorer === p.name);
  const indiv = individual ? 1 + individual.impact : 1.0;
  const sources: string[] = [];
  if (dvp !== 1) sources.push(`DvP ${defending} vs ${p.position} (${dvpSource}): x${dvp.toFixed(2)}`);
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
