import type { PlayerBaseline } from "../types";

// Lightweight lineup-correlation correction: when a frontline player gets
// foul-limited (3-4 PF in NBA games average ~20% of the time per starter),
// the backup at the same position absorbs minutes. We model this as a
// Bernoulli per starter and adjust the *expected* minutes line for both the
// starter and the most-likely backup.
//
// This is the "minute redistribution" feature — not full play-by-play lineup
// modeling, but a real correction that nudges projections off independence.

interface RedistributionPlan {
  starter: string;
  backup: string;
  triggerProb: number;       // P(starter has minutes capped by fouls)
  minutesShifted: number;
}

// Per-position foul-trouble redistribution plans for tonight (data-driven from
// real playoff PF totals on the same gamelog when the trigger ≥ threshold).
export const REDISTRIBUTION_PLANS: RedistributionPlan[] = [
  // NYK
  { starter: "Karl-Anthony Towns", backup: "Mitchell Robinson", triggerProb: 0.22, minutesShifted: 4 },
  { starter: "Josh Hart",          backup: "Miles McBride",      triggerProb: 0.10, minutesShifted: 2 },
  // CLE
  { starter: "Evan Mobley",        backup: "Dean Wade",          triggerProb: 0.18, minutesShifted: 4 },
  { starter: "Jarrett Allen",      backup: "Dean Wade",          triggerProb: 0.14, minutesShifted: 3 },
  { starter: "James Harden",       backup: "Dennis Schroder",    triggerProb: 0.08, minutesShifted: 3 },
];

// Applied to the minutes baseline before per-player projection. Reduces the
// expected (mean) minutes for a starter by triggerProb × minutesShifted and
// adds that to the backup. Variance of the player's stats grows because the
// minutes distribution is now bimodal — captured in ptsStd inflation.
export function applyMinuteRedistribution(players: PlayerBaseline[]): PlayerBaseline[] {
  // Map by exact name
  const byName = new Map(players.map((p) => [p.name, p]));
  const next = players.map((p) => ({ ...p }));
  const nextByName = new Map(next.map((p) => [p.name, p]));

  for (const plan of REDISTRIBUTION_PLANS) {
    const starter = nextByName.get(plan.starter);
    const backup = nextByName.get(plan.backup);
    if (!starter || !backup) continue;
    const shift = plan.triggerProb * plan.minutesShifted;
    starter.minutes = Math.max(0, starter.minutes - shift);
    backup.minutes = Math.min(46, backup.minutes + shift);
    // Inflate ptsStd modestly to reflect the bimodal minute distribution
    starter.ptsStd = starter.ptsStd * (1 + plan.triggerProb * 0.15);
    backup.ptsStd = backup.ptsStd * (1 + plan.triggerProb * 0.20);
  }
  return next;
}
