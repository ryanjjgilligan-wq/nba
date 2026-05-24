import type { BestBet } from "../types";

// Estimate pairwise correlation between bets. Returns -1..+1. Used to warn
// when a user is stacking bets that are effectively the same exposure —
// the biggest bankroll killer is correlated bets sized as if independent.
//
// Rough correlations (calibrated from intuition, not regressed — would need
// historical bet outcomes to fit properly):
//
// - Same selection                    : +1.00
// - Same market opposite side         : -1.00
// - Team-A spread + Team-A ML         : +0.75
// - Total OVER + Team-A spread cover  : +0.30
// - Total OVER + same-game player O   : +0.45 average
// - Same-team players both OVER       : +0.25
// - Opposite-team players both OVER   : +0.15 (game-wide pace)
//
// The point isn't precise correlation — it's identifying "you're effectively
// betting the same outcome three times."

export interface BetCorrelation {
  betA: BestBet;
  betB: BestBet;
  correlation: number; // -1..+1
  reason: string;
}

function parseTeam(selection: string): "home" | "away" | null {
  // Internal codes: CLE = home, NYK = away
  if (selection.startsWith("CLE")) return "home";
  if (selection.startsWith("NYK")) return "away";
  return null;
}

function playerName(b: BestBet): string | null {
  // Player prop selections look like "Wemby OVER 11.5 REB"
  if (b.market !== "playerProp") return null;
  const m = b.selection.match(/^(\S+)/);
  return m ? m[1] : null;
}

function playerTeamGuess(name: string | null, playerToTeam: Map<string, "home" | "away">): "home" | "away" | null {
  if (!name) return null;
  return playerToTeam.get(name) ?? null;
}

function isOver(selection: string): boolean | null {
  if (/OVER/i.test(selection)) return true;
  if (/UNDER/i.test(selection)) return false;
  return null;
}

function gameTotalDirection(b: BestBet): "over" | "under" | null {
  if (b.market !== "total") return null;
  return /OVER/i.test(b.selection) ? "over" : "under";
}

function pairwiseCorrelation(
  a: BestBet,
  b: BestBet,
  playerToTeam: Map<string, "home" | "away">,
): { c: number; reason: string } | null {
  if (a === b) return null;
  if (a.selection === b.selection) return { c: 1.0, reason: "Identical selection" };

  // Same market, opposite side
  if (a.market === b.market && a.market !== "playerProp") {
    const sideA = parseTeam(a.selection), sideB = parseTeam(b.selection);
    if (sideA && sideB && sideA !== sideB) return { c: -1.0, reason: "Opposite sides of the same market — never both" };
  }
  if (a.market === "total" && b.market === "total") {
    const dA = gameTotalDirection(a), dB = gameTotalDirection(b);
    if (dA && dB && dA !== dB) return { c: -1.0, reason: "OVER + UNDER on same total — never both" };
  }

  // Team-A spread + Team-A ML
  if ((a.market === "spread" && b.market === "ml") || (a.market === "ml" && b.market === "spread")) {
    const sideA = parseTeam(a.selection), sideB = parseTeam(b.selection);
    if (sideA && sideB && sideA === sideB) {
      return { c: 0.75, reason: "Spread + ML on same team — almost the same bet" };
    }
  }

  // Total OVER + same-side spread
  if (a.market === "total" && b.market === "spread") {
    const dA = gameTotalDirection(a);
    const sideB = parseTeam(b.selection);
    if (dA === "over" && sideB) return { c: 0.30, reason: "OVER + a spread cover both win in high-scoring games" };
  }
  if (a.market === "spread" && b.market === "total") return pairwiseCorrelation(b, a, playerToTeam);

  // Game total + player OVER
  if (a.market === "total" && b.market === "playerProp") {
    const dA = gameTotalDirection(a);
    const overB = isOver(b.selection);
    if (dA === "over" && overB) return { c: 0.45, reason: "OVER + player OVER both win in high-scoring games" };
    if (dA === "under" && overB === false) return { c: 0.45, reason: "UNDER + player UNDER both win in low-scoring games" };
  }
  if (a.market === "playerProp" && b.market === "total") return pairwiseCorrelation(b, a, playerToTeam);

  // Two player overs
  if (a.market === "playerProp" && b.market === "playerProp") {
    const teamA = playerTeamGuess(playerName(a), playerToTeam);
    const teamB = playerTeamGuess(playerName(b), playerToTeam);
    const overA = isOver(a.selection), overB = isOver(b.selection);
    if (overA != null && overB != null) {
      const sameDir = overA === overB;
      if (!sameDir) return null;
      if (teamA && teamB && teamA === teamB) {
        return { c: 0.25, reason: "Two same-team player props in the same direction (shared team scoring)" };
      }
      return { c: 0.12, reason: "Two same-direction player props in the same game (shared pace)" };
    }
  }
  return null;
}

export function findCorrelations(
  bets: BestBet[],
  playerToTeam: Map<string, "home" | "away">,
  minAbsCorr = 0.20,
): BetCorrelation[] {
  const out: BetCorrelation[] = [];
  for (let i = 0; i < bets.length; i++) {
    for (let j = i + 1; j < bets.length; j++) {
      const r = pairwiseCorrelation(bets[i], bets[j], playerToTeam);
      if (r && Math.abs(r.c) >= minAbsCorr) {
        out.push({ betA: bets[i], betB: bets[j], correlation: r.c, reason: r.reason });
      }
    }
  }
  // Sort by |correlation| descending so worst stacks bubble to top
  return out.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

// Aggregate exposure rollup: how many EV "lock units" are pointed at the
// same outcome class. Helps detect "you've got 4 bets that all win/lose
// together — sized as 4 × Kelly, you're really at 2.5x effective Kelly."
export function aggregateExposure(bets: BestBet[]): {
  homeSide: number;
  awaySide: number;
  over: number;
  under: number;
} {
  let homeSide = 0, awaySide = 0, over = 0, under = 0;
  for (const b of bets) {
    const t = parseTeam(b.selection);
    if (t === "home" && b.market !== "playerProp") homeSide += b.kellyFraction;
    if (t === "away" && b.market !== "playerProp") awaySide += b.kellyFraction;
    if (b.market === "total") {
      if (gameTotalDirection(b) === "over") over += b.kellyFraction;
      else under += b.kellyFraction;
    }
  }
  return { homeSide, awaySide, over, under };
}
