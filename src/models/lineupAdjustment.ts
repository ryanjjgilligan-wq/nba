import type { PlayerBaseline } from "../types";

// Foul-trouble redistribution plans for NYK @ CLE Game 4. Each entry is a
// starter whose minutes are partially absorbed by a backup at the same
// position (modeled as a Bernoulli with triggerProb).

interface RedistributionPlan {
  starter: string;
  backup: string;
  triggerProb: number;
  minutesShifted: number;
}

export const REDISTRIBUTION_PLANS: RedistributionPlan[] = [
  // NYK
  { starter: "Karl-Anthony Towns", backup: "Mitchell Robinson", triggerProb: 0.22, minutesShifted: 4 },
  { starter: "Josh Hart",          backup: "Miles McBride",      triggerProb: 0.10, minutesShifted: 2 },
  // CLE
  { starter: "Evan Mobley",        backup: "Dean Wade",          triggerProb: 0.18, minutesShifted: 4 },
  { starter: "Jarrett Allen",      backup: "Dean Wade",          triggerProb: 0.14, minutesShifted: 3 },
  { starter: "James Harden",       backup: "Dennis Schroder",    triggerProb: 0.08, minutesShifted: 3 },
];

export function applyMinuteRedistribution(players: PlayerBaseline[]): PlayerBaseline[] {
  const next = players.map((p) => ({ ...p }));
  const byName = new Map(next.map((p) => [p.name, p]));
  for (const plan of REDISTRIBUTION_PLANS) {
    const starter = byName.get(plan.starter);
    const backup = byName.get(plan.backup);
    if (!starter || !backup) continue;
    const shift = plan.triggerProb * plan.minutesShifted;
    starter.minutes = Math.max(0, starter.minutes - shift);
    backup.minutes = Math.min(46, backup.minutes + shift);
    starter.ptsStd = starter.ptsStd * (1 + plan.triggerProb * 0.15);
    backup.ptsStd = backup.ptsStd * (1 + plan.triggerProb * 0.20);
  }
  return next;
}
