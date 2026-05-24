import { describe, it, expect } from "vitest";
import { PLAYERS, PLAYERS_PROVENANCE } from "../src/data/fixtures/players";
import { TEAMS, TEAMS_PROVENANCE, GAME } from "../src/data/fixtures/game";
import { ODDS, ODDS_META } from "../src/data/fixtures/odds";
import { runEnsemble, DEFAULT_WEIGHTS } from "../src/models/ensemble";
import { projectPlayer } from "../src/models/playerProjection";
import { INJURIES } from "../src/data/fixtures/players";
import { SENTIMENT } from "../src/data/fixtures/sentiment";
import { buildBestBets } from "../src/models/marketComparison";

describe("real ESPN data (OKC @ SAS)", () => {
  it("loaded real roster (includes Wembanyama + SGA, no NYK/CLE players)", () => {
    expect(PLAYERS.length).toBeGreaterThanOrEqual(14);
    expect(PLAYERS.some((p) => p.name === "Victor Wembanyama")).toBe(true);
    expect(PLAYERS.some((p) => p.name === "Shai Gilgeous-Alexander")).toBe(true);
    expect(PLAYERS.some((p) => p.name === "Jalen Brunson")).toBe(false);
    expect(PLAYERS_PROVENANCE.count).toBe(PLAYERS.length);
  });

  it("loaded real SGA stats (per-36 PTS plausible for league-leading scorer)", () => {
    const sga = PLAYERS.find((p) => p.id === "sga")!;
    expect(sga).toBeDefined();
    expect(sga.ptsPer36).toBeGreaterThan(30);
    expect(sga.astPer36).toBeGreaterThan(5);
  });

  it("loaded real Wembanyama stats (defensive presence)", () => {
    const w = PLAYERS.find((p) => p.id === "wemby")!;
    expect(w).toBeDefined();
    expect(w.blkPer36).toBeGreaterThan(2.5);
    expect(w.rebPer36).toBeGreaterThan(10);
  });

  it("loaded real DraftKings odds (SAS -2.5, total 218.5)", () => {
    expect(ODDS_META.provider).toMatch(/DraftKings/i);
    expect(ODDS_META.closeSpread).toBe(-2.5);
    expect(ODDS_META.closeTotal).toBe(218.5);
    expect(ODDS.find((l) => /CLE -2\.5/.test(l.selection))).toBeDefined();
  });

  it("computed real team splits from playoff games", () => {
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

  it("uses REAL per-player home/away multipliers from game logs", () => {
    const sga = PLAYERS.find((p) => p.id === "sga")!;
    expect(sga.homeMult).toBeGreaterThan(0.5);
    expect(sga.homeMult).toBeLessThan(1.5);
    expect(sga.awayMult).toBeGreaterThan(0.5);
    expect(sga.awayMult).toBeLessThan(1.5);
  });

  it("loaded real opponent-specific history for at least some players", () => {
    const haveOppHistory = PLAYERS.filter((p) => p.vsOpponentN >= 2).length;
    expect(haveOppHistory).toBeGreaterThan(0);
  });

  it("loaded real rest-day multipliers", () => {
    const sga = PLAYERS.find((p) => p.id === "sga")!;
    expect(sga.rest2PlusMult).toBeGreaterThan(0);
    expect(sga.restB2BMult).toBeGreaterThan(0);
  });

  it("uses REAL playoff minutes when available", () => {
    const sga = PLAYERS.find((p) => p.id === "sga")!;
    expect(sga.playoffN).toBeGreaterThanOrEqual(8);
    expect(sga.playoffMin).toBeGreaterThan(30);
  });

  it("uses REAL team pace from sampled box scores", () => {
    expect(TEAMS.NYK.pace).toBeGreaterThan(95);
    expect(TEAMS.NYK.pace).toBeLessThan(110);
    expect(TEAMS.CLE.pace).toBeGreaterThan(95);
    expect(TEAMS.CLE.pace).toBeLessThan(110);
  });

  it("best bets list includes real-roster props (SGA, Wemby)", () => {
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
    expect(bets.find((b) => /SGA/.test(b.selection))).toBeDefined();
    expect(bets.find((b) => /Wemby/.test(b.selection))).toBeDefined();
  });
});
