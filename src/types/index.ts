export type TeamCode = "NYK" | "CLE";

export type Provenance = "LIVE" | "FIXTURE";

export interface Tagged<T> {
  data: T;
  provenance: Provenance;
  fetchedAt: string;
  source: string;
}

export interface PlayerBaseline {
  id: string;
  name: string;
  team: TeamCode;
  position: string;
  minutes: number;        // projected minutes
  usage: number;          // usage rate (0–1)
  ts: number;             // true shooting (0–1)
  pace: number;           // possessions / 48 for player's team
  // Per-minute production rates (season + recent blended)
  ptsPer36: number;
  rebPer36: number;
  astPer36: number;
  tpmPer36: number;       // three pointers made per 36
  stlPer36: number;
  blkPer36: number;
  toPer36: number;
  // Volatility
  ptsStd: number;         // game-to-game std dev of points
  // Home/away splits (multiplier vs baseline)
  homeMult: number;
  awayMult: number;
  // Recent form last 5 vs season (multiplier)
  recentForm: number;
  // NEW: opponent-specific multiplier (head-to-head history)
  vsOpponentMult: number;
  vsOpponentN: number;
  vsOpponentPPG: number;
  // NEW: rest-day multipliers
  restB2BMult: number;
  rest1Mult: number;
  rest2PlusMult: number;
  // NEW: playoff-only averages (truer signal for tonight)
  playoffMin: number;
  playoffPpg: number;
  playoffN: number;
  // Notes
  notes?: string;
}

export interface TeamBaseline {
  code: TeamCode;
  name: string;
  pace: number;
  ortg: number;            // points per 100 possessions
  drtg: number;
  homeOrtg: number;
  awayOrtg: number;
  homeDrtg: number;
  awayDrtg: number;
  threePtRate: number;     // share of FGA from three
  recordWinPct: number;
  restDays: number;
}

export interface InjuryNote {
  player: string;
  team: TeamCode;
  status: "OUT" | "QUESTIONABLE" | "PROBABLE" | "GTD";
  note: string;
  minutesImpact: number;
}

export interface GameContext {
  id: string;
  tipoffISO: string;
  venue: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  seriesText: string;
  refCrew?: string[];
  travelDays?: number;
  notes: string[];
}

export interface BettingLine {
  market: "spread" | "total" | "ml" | "playerProp";
  selection: string;        // e.g. "CLE -2.5", "OVER 213.5", "Brunson 28.5 PTS"
  price: number;            // American odds e.g. -110, +135
  book: string;
  line?: number;
  player?: string;
  prop?: "PTS" | "REB" | "AST" | "3PM" | "BLK" | "STL";
}

export interface SentimentItem {
  id: string;
  source: string;
  author: string;
  credibility: number;      // 0–1
  ts: string;
  text: string;
  topic: "injury" | "lineup" | "narrative" | "rumor" | "trend";
  team?: TeamCode;
  player?: string;
  polarity: number;         // -1..+1
  weightOnProjection: number; // ≤ 0.05 — sentiment is intentionally low-weight
  unverified?: boolean;
}

export interface PlayerProjection {
  playerId: string;
  name: string;
  team: TeamCode;
  minutes: number;
  pts: ProjectionDist;
  reb: ProjectionDist;
  ast: ProjectionDist;
  tpm: ProjectionDist;
  stl: ProjectionDist;
  blk: ProjectionDist;
  to: ProjectionDist;
  factors: FactorAttribution[];
}

export interface ProjectionDist {
  p25: number;
  p50: number;
  p75: number;
  mean: number;
  std: number;
}

export interface FactorAttribution {
  factor: string;
  delta: number;     // pts effect on the headline projection
  rationale: string;
}

export interface GameVerdict {
  awayScore: ProjectionDist;
  homeScore: ProjectionDist;
  total: ProjectionDist;
  margin: ProjectionDist;          // away - home
  homeWinProb: number;
  awayWinProb: number;
  ensembleComponents: EnsembleComponent[];
}

export interface EnsembleComponent {
  name: string;
  homeWinProb: number;
  awayWinProb: number;
  projTotal: number;
  projMargin: number;
  weight: number;
  notes: string;
}

export interface BestBet {
  market: BettingLine["market"];
  selection: string;
  bookPrice: number;
  bookImpliedProb: number;
  devigProb: number;
  modelProb: number;
  edgePct: number;
  evPer1U: number;
  kellyFraction: number;    // capped fractional Kelly (1/4 K default)
  confidence: "LOW" | "MED" | "HIGH";
  rationale: string;
}

export interface ModelDisagreement {
  topic: string;
  marketView: string;
  modelView: string;
  spread: number;
  classification: "EDGE" | "BLIND_SPOT" | "NEUTRAL";
  note: string;
}

export interface CalibrationSnapshot {
  brier: number;
  roiBySpread: number;
  roiByTotal: number;
  roiByProps: number;
  sampleSize: number;
  asOf: string;
}
