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

// Bayesian-ish per-player projection: blend prior (per-36 × minutes) with
// per-game stochastic modifiers (matchup, venue, pace, form, opponent-specific
// history, rest-day, sentiment). The mean/variance assumption is right-skewed
// for points (long tail for big nights), modeled by inflating the upper
// quartile distance relative to the lower — see dist() below.

const Z25 = -0.6745;
const Z75 = 0.6745;
// Skew factor: real game-to-game points are right-skewed; stretch upper tail.
const SKEW_UPPER = 1.18;
const SKEW_LOWER = 0.92;

function dist(mean: number, std: number, skew = false): ProjectionDist {
  const safe = Math.max(0, mean);
  const s = Math.max(0.5, std);
  const lower = skew ? SKEW_LOWER : 1.0;
  const upper = skew ? SKEW_UPPER : 1.0;
  return {
    mean: safe,
    std: s,
    p25: Math.max(0, safe + Z25 * s * lower),
    p50: safe,
    p75: safe + Z75 * s * upper,
  };
}

// Days of rest before tonight's game (Game 2 was Thu 5/21, Game 3 is Sat 5/23 → 2 days = 1 day rest)
const REST_DAYS_BEFORE_GAME: number = 1;

function pickRestMult(p: PlayerBaseline, restDays: number): number {
  if (restDays <= 0.5) return p.restB2BMult;
  if (restDays <= 1.5) return p.rest1Mult;
  return p.rest2PlusMult;
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

  // ----- Points baseline -----
  const base = (p.ptsPer36 * minutes) / 36;
  const venue = venueMultiplier(p, homeTeam);
  const { mult: matchupMult, sources: matchupSources } = matchupMultiplier(p, homeTeam);
  const pace = paceMultiplier(p, teams);

  // Opponent-specific multiplier (real head-to-head history, gated on having
  // enough sample). This REPLACES the synthetic DvP + defender prior when
  // available. Otherwise we fall back to the DvP table.
  const useOppHistory = p.vsOpponentN >= 3;
  const oppHistoryMult = useOppHistory ? p.vsOpponentMult : 1.0;

  // Rest-day adjustment (real)
  const restMult = pickRestMult(p, REST_DAYS_BEFORE_GAME);

  const venueDelta = (venue - 1) * ensembleKnobs.venue;
  // If we have real opponent history, weight that over the synthetic DvP table
  const matchupDelta = useOppHistory
    ? (oppHistoryMult - 1) * ensembleKnobs.matchup
    : (matchupMult - 1) * ensembleKnobs.matchup;
  const formDelta = (p.recentForm - 1) * ensembleKnobs.form;
  const restDelta = (restMult - 1) * 0.7; // dampen — single-game rest signal is noisy

  // Sentiment
  const playerSentiment = sentiment.filter(
    (s) => (s.player === p.name || s.team === p.team) && !s.unverified,
  );
  let sentDelta = 0;
  for (const s of playerSentiment) {
    sentDelta += s.polarity * s.weightOnProjection * ensembleKnobs.sentiment;
  }
  sentDelta = Math.max(-0.04, Math.min(0.04, sentDelta));

  const totalMult = pace
    * (1 + venueDelta)
    * (1 + matchupDelta)
    * (1 + formDelta)
    * (1 + restDelta)
    * (1 + sentDelta);
  const pts = base * totalMult;

  factors.push({
    factor: "Baseline (per-36 × proj minutes)",
    delta: base,
    rationale: `${p.ptsPer36.toFixed(1)} pts/36 × ${minutes.toFixed(1)} min — playoff minutes prior when available`,
  });
  factors.push({
    factor: "Pace adjustment",
    delta: base * (pace - 1),
    rationale: `Game pace vs team pace: x${pace.toFixed(3)}`,
  });
  factors.push({
    factor: "Venue (real home/away split from gamelog)",
    delta: base * pace * venueDelta,
    rationale: `${p.team === homeTeam ? "Home" : "Road"} mult x${venue.toFixed(3)} (weight ${ensembleKnobs.venue.toFixed(2)})`,
  });
  factors.push({
    factor: useOppHistory
      ? `Opponent history (real, n=${p.vsOpponentN} games vs ${p.team === homeTeam ? (homeTeam === "NYK" ? "CLE" : "NYK") : homeTeam})`
      : "Matchup (DvP + defender prior)",
    delta: base * pace * (1 + venueDelta) * matchupDelta,
    rationale: useOppHistory
      ? `Avg ${p.vsOpponentPPG.toFixed(1)} PPG vs this opponent → x${oppHistoryMult.toFixed(3)}`
      : matchupSources.join(" · ") || "Neutral matchup",
  });
  factors.push({
    factor: "Recent form (last 5)",
    delta: base * pace * (1 + venueDelta) * (1 + matchupDelta) * formDelta,
    rationale: `Real form multiplier x${p.recentForm.toFixed(3)}`,
  });
  factors.push({
    factor: `Rest (${REST_DAYS_BEFORE_GAME}-day, real history)`,
    delta: base * pace * (1 + venueDelta) * (1 + matchupDelta) * (1 + formDelta) * restDelta,
    rationale: `${REST_DAYS_BEFORE_GAME === 0 ? "B2B" : REST_DAYS_BEFORE_GAME === 1 ? "1-day rest" : "2+ rest"} avg multiplier x${restMult.toFixed(3)}`,
  });
  if (sentDelta !== 0) {
    factors.push({
      factor: "Sentiment (capped low-weight)",
      delta: base * pace * (1 + venueDelta) * (1 + matchupDelta) * (1 + formDelta) * (1 + restDelta) * sentDelta,
      rationale: "Aggregated reporter signal (capped ±4%)",
    });
  }

  // ----- Other counting stats -----
  const reb = (p.rebPer36 * minutes) / 36 * (1 + (totalMult - pace) * 0.3);
  const ast = (p.astPer36 * minutes) / 36 * (1 + (totalMult - pace) * 0.5);
  const tpm = (p.tpmPer36 * minutes) / 36 * (1 + venueDelta);
  const stl = (p.stlPer36 * minutes) / 36;
  const blk = (p.blkPer36 * minutes) / 36;
  const to = (p.toPer36 * minutes) / 36;

  const sigmaScale = Math.sqrt(Math.max(0.1, minutes / Math.max(1, p.minutes)));
  const ptsStd = p.ptsStd * sigmaScale;

  return {
    playerId: p.id,
    name: p.name,
    team: p.team,
    minutes,
    pts: dist(pts, ptsStd, true), // points are right-skewed → use skew distribution
    reb: dist(reb, Math.max(1.2, p.rebPer36 * 0.25 * sigmaScale)),
    ast: dist(ast, Math.max(0.9, p.astPer36 * 0.30 * sigmaScale)),
    tpm: dist(tpm, Math.max(0.8, p.tpmPer36 * 0.55 * sigmaScale), true), // 3PM also right-skewed
    stl: dist(stl, Math.max(0.5, p.stlPer36 * 0.60 * sigmaScale)),
    blk: dist(blk, Math.max(0.4, p.blkPer36 * 0.65 * sigmaScale)),
    to: dist(to, Math.max(0.5, p.toPer36 * 0.45 * sigmaScale)),
    factors,
  };
}
