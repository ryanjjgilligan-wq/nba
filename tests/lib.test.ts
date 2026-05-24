import { describe, it, expect } from "vitest";
import {
  americanToDecimal,
  americanToImplied,
  devigPair,
  evPerUnit,
  fractionalKelly,
  kellyFraction,
} from "../src/lib/devig";
import { normCdf, normInv, pNormalAbove, quantile } from "../src/lib/stats";
import { mulberry32, sampleNormal } from "../src/lib/rng";
import { runEnsemble, DEFAULT_WEIGHTS } from "../src/models/ensemble";
import { TEAMS, GAME } from "../src/data/fixtures/game";
import { PLAYERS } from "../src/data/fixtures/players";
import { buildBestBets } from "../src/models/marketComparison";
import { ODDS } from "../src/data/fixtures/odds";
import { projectPlayer } from "../src/models/playerProjection";
import { INJURIES } from "../src/data/fixtures/players";
import { SENTIMENT } from "../src/data/fixtures/sentiment";

describe("devig", () => {
  it("converts american odds correctly", () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.5238, 3);
    expect(americanToImplied(100)).toBeCloseTo(0.5, 3);
    expect(americanToImplied(150)).toBeCloseTo(0.4, 3);
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 3);
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 3);
  });

  it("devigs to sum 1", () => {
    const dv = devigPair(americanToImplied(-110), americanToImplied(-110));
    expect(dv.a + dv.b).toBeCloseTo(1, 6);
  });

  it("computes EV and Kelly", () => {
    const ev = evPerUnit(0.6, -110);
    expect(ev).toBeGreaterThan(0);
    const k = kellyFraction(0.6, -110);
    expect(k).toBeGreaterThan(0);
    const fk = fractionalKelly(0.6, -110, 0.25);
    expect(fk).toBeLessThanOrEqual(k * 0.25 + 1e-9);
    expect(fractionalKelly(0.4, -110)).toBe(0);
  });
});

describe("stats", () => {
  it("normCdf sanity", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 2);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 2);
  });

  it("normInv inverts", () => {
    expect(normInv(0.5)).toBeCloseTo(0, 2);
    expect(normInv(0.975)).toBeCloseTo(1.96, 1);
  });

  it("pNormalAbove", () => {
    expect(pNormalAbove(28.5, 30, 8)).toBeGreaterThan(0.5);
    expect(pNormalAbove(28.5, 20, 8)).toBeLessThan(0.5);
  });

  it("quantile", () => {
    const xs = Array.from({ length: 1000 }, (_, i) => i);
    expect(quantile(xs, 0.25)).toBeCloseTo(249.75, 0);
    expect(quantile(xs, 0.5)).toBeCloseTo(499.5, 0);
  });
});

describe("rng", () => {
  it("seeded normal samples are reproducible", () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    const a = sampleNormal(r1, 0, 1);
    const b = sampleNormal(r2, 0, 1);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("ensemble", () => {
  it("produces a coherent verdict", () => {
    const v = runEnsemble({
      homeTeam: GAME.homeTeam,
      teams: TEAMS,
      players: PLAYERS,
      iterations: 2000,
      seed: 42,
      weights: DEFAULT_WEIGHTS,
      marketTotal: 213.5,
      marketSpread: -2.5,
    });
    expect(v.homeWinProb + v.awayWinProb).toBeCloseTo(1, 6);
    expect(v.total.mean).toBeGreaterThan(180);
    expect(v.total.mean).toBeLessThan(260);
    expect(v.ensembleComponents.length).toBe(2);
  });
});

describe("best bets", () => {
  it("produces non-zero bet list and includes player props", () => {
    const v = runEnsemble({
      homeTeam: GAME.homeTeam,
      teams: TEAMS,
      players: PLAYERS,
      iterations: 1500,
      seed: 7,
      weights: DEFAULT_WEIGHTS,
      marketTotal: 213.5,
      marketSpread: -2.5,
    });
    const playerProjs = PLAYERS.map((p) =>
      projectPlayer(p, TEAMS, GAME.homeTeam, INJURIES, SENTIMENT, {
        matchup: DEFAULT_WEIGHTS.matchup,
        venue: DEFAULT_WEIGHTS.venue,
        form: DEFAULT_WEIGHTS.form,
        sentiment: DEFAULT_WEIGHTS.sentiment,
      }),
    );
    const bets = buildBestBets({
      lines: ODDS,
      verdict: v,
      players: playerProjs,
      homeTeam: GAME.homeTeam,
      kellyCap: 0.25,
    });
    expect(bets.length).toBeGreaterThan(5);
    const propBets = bets.filter((b) => b.market === "playerProp");
    expect(propBets.length).toBeGreaterThan(0);
    for (const b of bets) {
      expect(b.modelProb).toBeGreaterThanOrEqual(0);
      expect(b.modelProb).toBeLessThanOrEqual(1);
      expect(b.kellyFraction).toBeLessThanOrEqual(0.25 + 1e-9);
    }
  });
});

import { findCorrelations } from "../src/models/correlation";
import { computeClv } from "../src/lib/placedBets";

describe("correlation detector", () => {
  it("flags opposite-side totals as -1", () => {
    const bets = [
      { market: "total", selection: "OVER 219.5", bookPrice: -110, bookImpliedProb: 0.524, devigProb: 0.5, modelProb: 0.6, edgePct: 0.1, evPer1U: 0.05, kellyFraction: 0.05, confidence: "MED", rationale: "" },
      { market: "total", selection: "UNDER 219.5", bookPrice: -110, bookImpliedProb: 0.524, devigProb: 0.5, modelProb: 0.4, edgePct: -0.1, evPer1U: -0.05, kellyFraction: 0, confidence: "MED", rationale: "" },
    ] as any;
    const corrs = findCorrelations(bets, new Map());
    expect(corrs.length).toBe(1);
    expect(corrs[0].correlation).toBe(-1.0);
  });

  it("flags spread + ML on same team as +0.75", () => {
    const bets = [
      { market: "spread", selection: "NYK +2.5", bookPrice: -110, bookImpliedProb: 0.524, devigProb: 0.5, modelProb: 0.6, edgePct: 0.1, evPer1U: 0.05, kellyFraction: 0.05, confidence: "MED", rationale: "" },
      { market: "ml", selection: "NYK ML", bookPrice: 120, bookImpliedProb: 0.454, devigProb: 0.43, modelProb: 0.55, edgePct: 0.12, evPer1U: 0.1, kellyFraction: 0.08, confidence: "MED", rationale: "" },
    ] as any;
    const corrs = findCorrelations(bets, new Map());
    expect(corrs.length).toBe(1);
    expect(corrs[0].correlation).toBeCloseTo(0.75);
  });
});

describe("clv computation", () => {
  it("computes positive CLV when placement beat current line", () => {
    const placed = {
      id: "x", selection: "NYK +2.5", market: "spread",
      priceAtPlacement: +110, modelProbAtPlacement: 0.55, edgePctAtPlacement: 0.05,
      kellyAtPlacement: 0.05, stakeUSD: 50, placedAtISO: "2026-05-24T20:00:00Z", gameId: "g1",
    } as any;
    const r = computeClv(placed, -110);
    // Placed at +110 (got better price than current -110) → BEAT close
    expect(r.clvDirection).toBe("BEAT");
    expect(r.clvPct!).toBeGreaterThan(0);
  });
});

describe("player projections", () => {
  it("projects a star player with positive minutes and reasonable pts", () => {
    // Find any high-usage starter (works across whichever game is loaded)
    const star = PLAYERS.find((p) => p.usage > 0.22 && p.ptsPer36 > 22)!;
    expect(star).toBeDefined();
    const proj = projectPlayer(
      star,
      TEAMS,
      GAME.homeTeam,
      INJURIES,
      SENTIMENT,
      { matchup: 1, venue: 1, form: 1, sentiment: 1 },
    );
    expect(proj.minutes).toBeGreaterThan(25);
    expect(proj.pts.mean).toBeGreaterThan(15);
    expect(proj.pts.mean).toBeLessThan(50);
    expect(proj.factors.length).toBeGreaterThan(3);
  });
});
