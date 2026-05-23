import { GAME, TEAMS, TEAMS_PROVENANCE } from "../fixtures/game";
import { INJURIES, PLAYERS, PLAYERS_PROVENANCE } from "../fixtures/players";
import { ODDS, ODDS_META } from "../fixtures/odds";
import { SENTIMENT } from "../fixtures/sentiment";
import type { DataProvider } from "./types";
import realDump from "../fixtures/_real.json";

const REAL_META = realDump as { fetchedAt: string; source: string };
const wrap = <T,>(data: T, source: string, provenance: "LIVE" | "FIXTURE" = "LIVE") => ({
  data,
  provenance,
  fetchedAt: REAL_META.fetchedAt,
  source,
});

// The "fixture" provider here actually serves REAL ESPN-pulled data
// (player season averages, team home/away splits, current DraftKings closing
// odds), cached at build time via scripts/build-fixtures.mjs. It's labeled
// LIVE because the numbers were pulled from a live source — they're only
// "fixture" in the sense that they ship in the bundle. The live-runtime
// provider in providers/live.ts can refresh them per-request.

export const fixtureProvider: DataProvider = {
  async getGame() {
    return wrap(GAME, `ESPN scoreboard (game ${REAL_META.source})`);
  },
  async getTeams() {
    return wrap(
      TEAMS,
      `ESPN team schedules — splits from ${TEAMS_PROVENANCE.cleHomeN + TEAMS_PROVENANCE.cleAwayN} CLE games / ${TEAMS_PROVENANCE.nykHomeN + TEAMS_PROVENANCE.nykAwayN} NYK games`,
    );
  },
  async getPlayers() {
    return wrap(PLAYERS, `ESPN 2025-26 season averages, ${PLAYERS_PROVENANCE.count} players`);
  },
  async getInjuries() {
    return wrap(INJURIES, "manual stub — set up live injury feed to replace", "FIXTURE");
  },
  async getOdds() {
    const isReal = ODDS_META.provider !== "fallback";
    return wrap(
      ODDS,
      isReal
        ? `${ODDS_META.provider} closing (ESPN scoreboard); open spread ${ODDS_META.openSpread} → close ${ODDS_META.closeSpread}`
        : "fallback (no live odds)",
      isReal ? "LIVE" : "FIXTURE",
    );
  },
  async getSentiment() {
    return wrap(SENTIMENT, "manual stub — wire X API key to replace", "FIXTURE");
  },
};

export { ODDS_META, PLAYERS_PROVENANCE, TEAMS_PROVENANCE };
