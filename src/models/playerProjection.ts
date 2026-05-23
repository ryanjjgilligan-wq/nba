import type {
  FactorAttribution,
  InjuryNote,
  PlayerBaseline,
  PlayerProjection,
  ProjectionDist,
  SentimentItem,
  TeamBaseline,
} from "../types";
import { matchupMultiplier, paceMultiplier, venueMultiplier } from "./matchup";

// Bayesian-ish stat projection: blend prior (season) with per-game stochastic
// modifiers (matchup, venue, pace, form, sentiment). We return mean/std and
// quartiles assuming roughly normal game-to-game variance, which is a good
// approximation for points and a serviceable one for rebs/asts at the volumes
// these starters see.

const Z25 = -0.6745; // standard normal quartiles
const Z75 = 0.6745;

function dist(mean: number, std: number): ProjectionDist {
  const safe = Math.max(0, mean);
  const s = Math.max(0.5, std);
  return {
    mean: safe,
    std: s,
    p25: Math.max(0, safe + Z25 * s),
    p50: safe,
    p75: safe + Z75 * s,
  };
}

export function projectPlayer(
  p: PlayerBaseline,
  teams: Record<"NYK" | "CLE", TeamBaseline>,
  homeTeam: "NYK" | "CLE",
  injuries: InjuryNote[],
  sentiment: SentimentItem[],
  ensembleKnobs: { matchup: number; venue: number; form: number; sentiment: number },
): PlayerProjection {
  const factors: FactorAttribution[] = [];

  // ----- Minutes -----
  let minutes = p.minutes;
  const injMyTeam = injuries.find((i) => i.team === p.team && i.player === p.name);
  if (injMyTeam) minutes += injMyTeam.minutesImpact;
  // Implicit minutes bump if a same-position teammate is OUT
  const outTeammates = injuries.filter(
    (i) => i.team === p.team && i.status === "OUT" && i.player !== p.name,
  );
  if (outTeammates.length) {
    minutes += Math.min(4, outTeammates.length * 2);
    factors.push({
      factor: "Teammate OUT",
      delta: 0,
      rationale: `${outTeammates.map((o) => o.player).join(", ")} OUT — minutes bump.`,
    });
  }
  minutes = Math.max(0, Math.min(46, minutes));

  // ----- Points -----
  const base = (p.ptsPer36 * minutes) / 36;
  const venue = venueMultiplier(p, homeTeam);
  const { mult: matchupMult, sources: matchupSources } = matchupMultiplier(p, homeTeam);
  const pace = paceMultiplier(p, teams);

  const venueDelta = (venue - 1) * ensembleKnobs.venue;
  const matchupDelta = (matchupMult - 1) * ensembleKnobs.matchup;
  const formDelta = (p.recentForm - 1) * ensembleKnobs.form;

  // Sentiment: tiny, capped influence
  const playerSentiment = sentiment.filter(
    (s) => (s.player === p.name || s.team === p.team) && !s.unverified,
  );
  let sentDelta = 0;
  for (const s of playerSentiment) {
    sentDelta += s.polarity * s.weightOnProjection * ensembleKnobs.sentiment;
  }
  sentDelta = Math.max(-0.04, Math.min(0.04, sentDelta));

  const totalMult = pace * (1 + venueDelta) * (1 + matchupDelta) * (1 + formDelta) * (1 + sentDelta);
  const pts = base * totalMult;

  factors.push({
    factor: "Baseline (season per-36 × proj minutes)",
    delta: base,
    rationale: `${p.ptsPer36.toFixed(1)} per-36 × ${minutes.toFixed(1)} min`,
  });
  factors.push({
    factor: "Pace adjustment",
    delta: base * (pace - 1),
    rationale: `Game pace vs player team pace: x${pace.toFixed(3)}`,
  });
  factors.push({
    factor: "Venue (home/away split)",
    delta: base * pace * venueDelta,
    rationale: `${p.team === homeTeam ? "Home" : "Road"} multiplier x${venue.toFixed(3)} (weight ${ensembleKnobs.venue.toFixed(2)})`,
  });
  factors.push({
    factor: "Matchup (DvP + defender)",
    delta: base * pace * (1 + venueDelta) * matchupDelta,
    rationale: matchupSources.join(" · ") || "Neutral matchup",
  });
  factors.push({
    factor: "Recent form (last 5)",
    delta: base * pace * (1 + venueDelta) * (1 + matchupDelta) * formDelta,
    rationale: `Recent form multiplier x${p.recentForm.toFixed(2)}`,
  });
  if (sentDelta !== 0) {
    factors.push({
      factor: "Sentiment (low-weight)",
      delta: base * pace * (1 + venueDelta) * (1 + matchupDelta) * (1 + formDelta) * sentDelta,
      rationale: `Aggregated reporter signal (capped ±4%)`,
    });
  }

  // ----- Other counting stats: scale per-36 × minutes, scaled by same totalMult for context-sensitive stats -----
  const reb = (p.rebPer36 * minutes) / 36 * (1 + (totalMult - pace) * 0.3);
  const ast = (p.astPer36 * minutes) / 36 * (1 + (totalMult - pace) * 0.5);
  const tpm = (p.tpmPer36 * minutes) / 36 * (1 + venueDelta);
  const stl = (p.stlPer36 * minutes) / 36;
  const blk = (p.blkPer36 * minutes) / 36;
  const to = (p.toPer36 * minutes) / 36;

  // Std scales with sqrt(minutes / baseline minutes)
  const sigmaScale = Math.sqrt(Math.max(0.1, minutes / Math.max(1, p.minutes)));
  const ptsStd = p.ptsStd * sigmaScale;

  return {
    playerId: p.id,
    name: p.name,
    team: p.team,
    minutes,
    pts: dist(pts, ptsStd),
    reb: dist(reb, Math.max(1.2, p.rebPer36 * 0.25 * sigmaScale)),
    ast: dist(ast, Math.max(0.9, p.astPer36 * 0.30 * sigmaScale)),
    tpm: dist(tpm, Math.max(0.8, p.tpmPer36 * 0.55 * sigmaScale)),
    stl: dist(stl, Math.max(0.5, p.stlPer36 * 0.60 * sigmaScale)),
    blk: dist(blk, Math.max(0.4, p.blkPer36 * 0.65 * sigmaScale)),
    to: dist(to, Math.max(0.5, p.toPer36 * 0.45 * sigmaScale)),
    factors,
  };
}
