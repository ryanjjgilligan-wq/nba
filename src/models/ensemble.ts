import type {
  EnsembleComponent,
  GameVerdict,
  ModelDisagreement,
  PlayerBaseline,
  TeamBaseline,
} from "../types";
import { monteCarloComponent } from "./monteCarlo";
import { regressionComponent } from "./regression";
import { normCdf } from "../lib/stats";

export interface EnsembleWeights {
  monteCarlo: number;
  regression: number;
  // model-tilt knobs applied to per-player projections
  matchup: number;
  venue: number;
  form: number;
  sentiment: number;
}

export const DEFAULT_WEIGHTS: EnsembleWeights = {
  monteCarlo: 0.6,
  regression: 0.4,
  matchup: 0.9,
  venue: 1.0, // venue weighted heavily — defining signal for this matchup
  form: 0.6,
  sentiment: 0.5,
};

export interface EnsembleInput {
  homeTeam: "NYK" | "CLE";
  teams: Record<"NYK" | "CLE", TeamBaseline>;
  players: PlayerBaseline[];
  iterations: number;
  seed: number;
  weights: EnsembleWeights;
  marketTotal: number;
  marketSpread: number;
}

export function runEnsemble(input: EnsembleInput): GameVerdict {
  const wTotal = input.weights.monteCarlo + input.weights.regression;
  const wMc = input.weights.monteCarlo / wTotal;
  const wReg = input.weights.regression / wTotal;

  const mc = monteCarloComponent(
    {
      homeTeam: input.homeTeam,
      teams: input.teams,
      players: input.players,
      iterations: input.iterations,
      seed: input.seed,
      knobs: input.weights,
    },
    wMc,
  );

  const reg = regressionComponent(
    {
      homeTeam: input.homeTeam,
      teams: input.teams,
      marketTotal: input.marketTotal,
      marketSpread: input.marketSpread,
      knobs: input.weights,
    },
    wReg,
  );

  // Blend
  const homeWinProb = mc.verdict.homeWinProb * wMc + reg.homeWinProb * wReg;
  const awayWinProb = 1 - homeWinProb;
  const projTotal = mc.verdict.total.mean * wMc + reg.projTotal * wReg;
  const projMargin = mc.verdict.margin.mean * wMc + reg.projMargin * wReg;

  const sigmaTotal = mc.verdict.total.std;
  const sigmaMargin = mc.verdict.margin.std;

  // Recompute home/away score means consistent with blended total/margin
  const homeMean = (projTotal - projMargin) / 2;
  const awayMean = (projTotal + projMargin) / 2;

  return {
    homeScore: {
      mean: homeMean,
      std: mc.verdict.homeScore.std,
      p25: homeMean - 0.6745 * mc.verdict.homeScore.std,
      p50: homeMean,
      p75: homeMean + 0.6745 * mc.verdict.homeScore.std,
    },
    awayScore: {
      mean: awayMean,
      std: mc.verdict.awayScore.std,
      p25: awayMean - 0.6745 * mc.verdict.awayScore.std,
      p50: awayMean,
      p75: awayMean + 0.6745 * mc.verdict.awayScore.std,
    },
    total: {
      mean: projTotal,
      std: sigmaTotal,
      p25: projTotal - 0.6745 * sigmaTotal,
      p50: projTotal,
      p75: projTotal + 0.6745 * sigmaTotal,
    },
    margin: {
      mean: projMargin,
      std: sigmaMargin,
      p25: projMargin - 0.6745 * sigmaMargin,
      p50: projMargin,
      p75: projMargin + 0.6745 * sigmaMargin,
    },
    homeWinProb,
    awayWinProb,
    ensembleComponents: [mc.component, reg.component],
  };
}

export function disagreementReport(
  verdict: GameVerdict,
  marketSpread: number,
  marketTotal: number,
  marketHomeImpliedProb: number,
): ModelDisagreement[] {
  const out: ModelDisagreement[] = [];

  // Cross-component disagreement
  const [mc, reg] = verdict.ensembleComponents;
  if (mc && reg) {
    const probGap = Math.abs(mc.homeWinProb - reg.homeWinProb);
    if (probGap > 0.04) {
      out.push({
        topic: "Win probability — Monte Carlo vs Regression",
        marketView: `Regression: home ${(reg.homeWinProb * 100).toFixed(1)}%`,
        modelView: `Monte Carlo: home ${(mc.homeWinProb * 100).toFixed(1)}%`,
        spread: probGap,
        classification: probGap > 0.07 ? "BLIND_SPOT" : "NEUTRAL",
        note:
          probGap > 0.07
            ? "Components diverge meaningfully — treat win-side picks with extra caution."
            : "Mild divergence between components; ensemble blend is the better estimator.",
      });
    }
  }

  // Model vs market
  const modelMargin = verdict.margin.mean;
  const marketImpliedMargin = marketSpread; // home spread (negative if home favored)
  const marginGap = modelMargin - marketImpliedMargin;
  if (Math.abs(marginGap) >= 1.5) {
    out.push({
      topic: "Margin vs market spread",
      marketView: `Market spread: home ${marketImpliedMargin >= 0 ? "+" : ""}${marketImpliedMargin}`,
      modelView: `Model margin: ${modelMargin >= 0 ? "+" : ""}${modelMargin.toFixed(1)} (away - home)`,
      spread: Math.abs(marginGap),
      classification: Math.abs(marginGap) >= 2.5 ? "EDGE" : "NEUTRAL",
      note: marginGap > 0
        ? "Model leans toward the away team relative to the market."
        : "Model leans toward the home team relative to the market.",
    });
  }

  const totalGap = verdict.total.mean - marketTotal;
  if (Math.abs(totalGap) >= 1.5) {
    out.push({
      topic: "Total vs market total",
      marketView: `Market total: ${marketTotal}`,
      modelView: `Model total: ${verdict.total.mean.toFixed(1)}`,
      spread: Math.abs(totalGap),
      classification: Math.abs(totalGap) >= 2.5 ? "EDGE" : "NEUTRAL",
      note: totalGap > 0 ? "Model leans OVER." : "Model leans UNDER.",
    });
  }

  const winGap = verdict.homeWinProb - marketHomeImpliedProb;
  if (Math.abs(winGap) >= 0.04) {
    out.push({
      topic: "Win probability vs market ML",
      marketView: `Market home win prob: ${(marketHomeImpliedProb * 100).toFixed(1)}%`,
      modelView: `Model home win prob: ${(verdict.homeWinProb * 100).toFixed(1)}%`,
      spread: Math.abs(winGap),
      classification: Math.abs(winGap) >= 0.07 ? "EDGE" : "NEUTRAL",
      note:
        winGap > 0
          ? "Model is more bullish on the home team than the moneyline implies."
          : "Model is more bearish on the home team than the moneyline implies.",
    });
  }

  return out;
}

// Helper kept here so other modules can call directly
export { normCdf };
