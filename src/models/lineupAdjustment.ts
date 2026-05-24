import type { PlayerBaseline } from "../types";

// Foul-trouble redistribution plans for OKC @ SAS. Each entry is a starter
// whose minutes are partially absorbed by a backup at the same position
// (modeled as a Bernoulli per-game with triggerProb).

interface RedistributionPlan {
  starter: string;
  backup: string;
  triggerProb: number;
  minutesShifted: number;
}

export const REDISTRIBUTION_PLANS: RedistributionPlan[] = [
  // OKC
  { starter: "Chet Holmgren",  backup: "Isaiah Hartenstein", triggerProb: 0.24, minutesShifted: 5 },
  { starter: "Luguentz Dort",  backup: "Aaron Wiggins",      triggerProb: 0.18, minutesShifted: 4 },
  { starter: "Cason Wallace",  backup: "Alex Caruso",        triggerProb: 0.16, minutesShifted: 3 },
  // SAS
  { starter: "Victor Wembanyama", backup: "Luke Kornet",     triggerProb: 0.22, minutesShifted: 5 },
  { starter: "Stephon Castle",    backup: "Dylan Harper",    triggerProb: 0.14, minutesShifted: 4 },
  { starter: "Keldon Johnson",    backup: "Julian Champagnie", triggerProb: 0.12, minutesShifted: 3 },
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
