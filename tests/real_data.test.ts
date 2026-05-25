import { describe, it, expect } from "vitest";
import { PLAYERS, PLAYERS_PROVENANCE } from "../src/data/fixtures/players";
import { TEAMS, TEAMS_PROVENANCE, GAME } from "../src/data/fixtures/game";
import { ODDS, ODDS_META } from "../src/data/fixtures/odds";
import { runEnsemble, DEFAULT_WEIGHTS } from "../src/models/ensemble";
import { projectPlayer } from "../src/models/playerProjection";
import { INJURIES } from "../src/data/fixtures/players";
import { SENTIMENT } from "../src/data/fixtures/sentiment";
import { buildBestBets } from "../src/models/marketComparison";

describe("real ESPN data (NYK @ CLE Game 4)", () => {
  it("loaded real roster (includes Brunson + Mitchell + Harden; no OKC/SAS players)", () => {
    expect(PLAYERS.length).toBeGreaterThanOrEqual(13);
    expect(PLAYERS.some((p) => p.name === "Jalen Brunson")).toBe(true);
    expect(PLAYERS.some((p) => p.name === "Donovan Mitchell")).toBe(true);
    expect(PLAYERS.some((p) => p.name === "James Harden")).toBe(true);
    expect(PLAYERS.some((p) => p.name === "Victor Wembanyama")).toBe(false);
    expect(PLAYERS_PROVENANCE.count).toBe(PLAYERS.length);
  });

  it("loaded real Brunson stats", () => {
    const b = PLAYERS.find((p) => p.id === "brunson")!;
    expect(b).toBeDefined();
    expect(b.ptsPer36).toBeGreaterThan(22);
    expect(b.astPer36).toBeGreaterThan(5);
  });

  it("loaded real Mitchell stats (high-usage scorer)", () => {
    const m = PLAYERS.find((p) => p.id === "mitchell")!;
    expect(m).toBeDefined();
    expect(m.ptsPer36).toBeGreaterThan(24);
    expect(m.usage).toBeGreaterThan(0.20);
  });

  it("loaded real DraftKings odds (NYK favored on road, real total)", () => {
    expect(ODDS_META.provider).toMatch(/DraftKings/i);
    // Home spread is positive (CLE +2.5) — NYK is the road favorite
    expect(ODDS_META.closeSpread).toBeGreaterThan(0);
    expect(ODDS_META.closeTotal).toBeGreaterThan(200);
    expect(ODDS_META.closeTotal).toBeLessThan(230);
  });

  it("computed real team splits", () => {
    expect(TEAMS_PROVENANCE.cleHomeN).toBeGreaterThan(0);
    expect(TEAMS.NYK.homeOrtg).toBeGreaterThan(0);
    expect(TEAMS.CLE.homeOrtg).toBeGreaterThan(0);
  });

  it("real-data ensemble produces a coherent verdict", () => {
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
    expect(v.total.mean).toBeGreaterThan(195);
    expect(v.total.mean).toBeLessThan(250);
    expect(v.homeWinProb).toBeGreaterThan(0);
    expect(v.homeWinProb).toBeLessThan(1);
  });

  it("uses real per-player home/away multipliers from game logs", () => {
    const brunson = PLAYERS.find((p) => p.id === "brunson")!;
    expect(brunson.homeMult).toBeGreaterThan(0.5);
    expect(brunson.homeMult).toBeLessThan(1.5);
    expect(brunson.awayMult).toBeGreaterThan(0.5);
    expect(brunson.awayMult).toBeLessThan(1.5);
  });

  it("loaded real opponent-specific history for some players", () => {
    const withOppHistory = PLAYERS.filter((p) => p.vsOpponentN >= 2).length;
    expect(withOppHistory).toBeGreaterThan(0);
  });

  it("loaded real rest-day multipliers", () => {
    const brunson = PLAYERS.find((p) => p.id === "brunson")!;
    expect(brunson.rest2PlusMult).toBeGreaterThan(0);
    expect(brunson.restB2BMult).toBeGreaterThan(0);
  });

  it("uses real playoff minutes when available", () => {
    const brunson = PLAYERS.find((p) => p.id === "brunson")!;
    expect(brunson.playoffN).toBeGreaterThanOrEqual(8);
    expect(brunson.playoffMin).toBeGreaterThan(30);
  });

  it("uses real team pace from sampled box scores", () => {
    expect(TEAMS.NYK.pace).toBeGreaterThan(90);
    expect(TEAMS.NYK.pace).toBeLessThan(110);
    expect(TEAMS.CLE.pace).toBeGreaterThan(90);
    expect(TEAMS.CLE.pace).toBeLessThan(110);
  });

  it("best bets list includes real-roster player props", () => {
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
    expect(bets.find((b) => /Brunson/.test(b.selection))).toBeDefined();
    expect(bets.find((b) => /Mitchell/.test(b.selection))).toBeDefined();
  });
});
