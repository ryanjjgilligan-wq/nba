import { describe, it, expect } from "vitest";
import { PLAYERS, PLAYERS_PROVENANCE } from "../src/data/fixtures/players";
import { TEAMS, TEAMS_PROVENANCE, GAME } from "../src/data/fixtures/game";
import { ODDS, ODDS_META } from "../src/data/fixtures/odds";
import { runEnsemble, DEFAULT_WEIGHTS } from "../src/models/ensemble";
import { projectPlayer } from "../src/models/playerProjection";
import { INJURIES } from "../src/data/fixtures/players";
import { SENTIMENT } from "../src/data/fixtures/sentiment";
import { buildBestBets } from "../src/models/marketComparison";

describe("real ESPN data", () => {
  it("loaded real player roster (no Garland, includes Harden)", () => {
    expect(PLAYERS.length).toBeGreaterThanOrEqual(13);
    expect(PLAYERS.some((p) => p.name === "James Harden")).toBe(true);
    expect(PLAYERS.some((p) => p.name === "Darius Garland")).toBe(false);
    expect(PLAYERS_PROVENANCE.count).toBe(PLAYERS.length);
  });

  it("loaded real Brunson stats (26.0 PTS season avg)", () => {
    const b = PLAYERS.find((p) => p.id === "brunson")!;
    expect(b).toBeDefined();
    // per-36 should be close to 26.0 * (36/35) = 26.7
    expect(b.ptsPer36).toBeGreaterThan(25);
    expect(b.ptsPer36).toBeLessThan(28);
    expect(b.astPer36).toBeGreaterThan(6.5);
  });

  it("loaded real DraftKings odds (CLE -2.5, total 215.5)", () => {
    expect(ODDS_META.provider).toMatch(/DraftKings/i);
    expect(ODDS_META.closeSpread).toBe(-2.5);
    expect(ODDS_META.closeTotal).toBe(215.5);
    const spread = ODDS.find((l) => l.selection.includes("CLE -2.5"));
    expect(spread).toBeDefined();
  });

  it("captured real line movement (CLE opened +1.5, closed -2.5)", () => {
    expect(ODDS_META.openSpread).toBe(1.5);
    expect(ODDS_META.closeSpread).toBe(-2.5);
  });

  it("computed real team splits from playoff games (CLE home>>away)", () => {
    expect(TEAMS_PROVENANCE.cleHomeN).toBeGreaterThan(0);
    expect(TEAMS.CLE.homeOrtg).toBeGreaterThan(TEAMS.CLE.awayOrtg);
    expect(TEAMS.NYK.homeOrtg).toBeGreaterThan(0);
  });

  it("real-data ensemble produces a reasonable verdict", () => {
    const v = runEnsemble({
      homeTeam: GAME.homeTeam,
      teams: TEAMS,
      players: PLAYERS,
      iterations: 3000,
      seed: 42,
      weights: DEFAULT_WEIGHTS,
      marketTotal: ODDS_META.closeTotal!,
      marketSpread: ODDS_META.closeSpread!,
    });
    expect(v.total.mean).toBeGreaterThan(200);
    expect(v.total.mean).toBeLessThan(240);
    expect(v.homeWinProb).toBeGreaterThan(0);
    expect(v.homeWinProb).toBeLessThan(1);
  });

  it("uses REAL per-player home/away multipliers from game logs", () => {
    const mitchell = PLAYERS.find((p) => p.id === "mitchell")!;
    // Real Mitchell split: home 27.5 / away 27.0 → nearly neutral mults
    expect(Math.abs(mitchell.homeMult - 1.0)).toBeLessThan(0.05);
    expect(Math.abs(mitchell.awayMult - 1.0)).toBeLessThan(0.05);

    // Real Harden split: scores MORE on the road
    const harden = PLAYERS.find((p) => p.id === "harden")!;
    expect(harden.awayMult).toBeGreaterThan(harden.homeMult);

    // Real Allen split: scores MORE on the road
    const allen = PLAYERS.find((p) => p.id === "allen")!;
    expect(allen.awayMult).toBeGreaterThan(allen.homeMult);
  });

  it("loaded real opponent-specific history (vsOpponent splits)", () => {
    // Mitchell has real vs-NYK history
    const mitchell = PLAYERS.find((p) => p.id === "mitchell")!;
    expect(mitchell.vsOpponentN).toBeGreaterThanOrEqual(3);
    expect(mitchell.vsOpponentPPG).toBeGreaterThan(0);
    // Mobley vs NYK: real history shows ~15.4 PPG vs ~18.2 season — multiplier below 1.0
    const mobley = PLAYERS.find((p) => p.id === "mobley")!;
    expect(mobley.vsOpponentN).toBeGreaterThanOrEqual(3);
    expect(mobley.vsOpponentMult).toBeLessThan(1.0);
  });

  it("loaded real rest-day multipliers", () => {
    const brunson = PLAYERS.find((p) => p.id === "brunson")!;
    expect(brunson.rest2PlusMult).toBeGreaterThan(0);
    expect(brunson.restB2BMult).toBeGreaterThan(0);
    // The three multipliers should sum to roughly 3.0 (averaged near 1.0 each)
    const sum = brunson.restB2BMult + brunson.rest1Mult + brunson.rest2PlusMult;
    expect(sum).toBeGreaterThan(2.0);
    expect(sum).toBeLessThan(4.0);
  });

  it("uses REAL playoff minutes when available (not synthetic projMin)", () => {
    const brunson = PLAYERS.find((p) => p.id === "brunson")!;
    expect(brunson.playoffN).toBeGreaterThanOrEqual(8);
    expect(brunson.playoffMin).toBeGreaterThan(30);
    // Minutes baseline should match playoff minutes within a couple
    expect(Math.abs(brunson.minutes - brunson.playoffMin)).toBeLessThan(3);
  });

  it("uses REAL team pace from sampled box scores (not assumed 98)", () => {
    expect(TEAMS.NYK.pace).toBeGreaterThan(97);
    expect(TEAMS.NYK.pace).toBeLessThan(101);
    expect(TEAMS.CLE.pace).toBeGreaterThan(97);
    expect(TEAMS.CLE.pace).toBeLessThan(102);
    // The two teams have different real paces — neither is the placeholder 98 exactly
    expect(TEAMS.NYK.pace).not.toBe(98);
    expect(TEAMS.CLE.pace).not.toBe(97.6);
  });

  it("real-data best bets produces ranked list with real player names", () => {
    const v = runEnsemble({
      homeTeam: GAME.homeTeam,
      teams: TEAMS,
      players: PLAYERS,
      iterations: 1500,
      seed: 7,
      weights: DEFAULT_WEIGHTS,
      marketTotal: ODDS_META.closeTotal!,
      marketSpread: ODDS_META.closeSpread!,
    });
    const projs = PLAYERS.map((p) =>
      projectPlayer(p, TEAMS, GAME.homeTeam, INJURIES, SENTIMENT, {
        matchup: 1, venue: 1, form: 1, sentiment: 1,
      }),
    );
    const bets = buildBestBets({ lines: ODDS, verdict: v, players: projs, homeTeam: GAME.homeTeam, kellyCap: 0.25 });
    expect(bets.length).toBeGreaterThan(8);
    // Real-roster prop should resolve
    const harden = bets.find((b) => /Harden/.test(b.selection));
    expect(harden).toBeDefined();
  });
});
