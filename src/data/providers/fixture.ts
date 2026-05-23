import { GAME, TEAMS } from "../fixtures/game";
import { INJURIES, PLAYERS } from "../fixtures/players";
import { ODDS } from "../fixtures/odds";
import { SENTIMENT } from "../fixtures/sentiment";
import type { DataProvider } from "./types";

const now = () => new Date().toISOString();

const wrap = <T,>(data: T, source: string) => ({
  data,
  provenance: "FIXTURE" as const,
  fetchedAt: now(),
  source,
});

export const fixtureProvider: DataProvider = {
  async getGame() {
    return wrap(GAME, "bundled/fixtures/game.ts");
  },
  async getTeams() {
    return wrap(TEAMS, "bundled/fixtures/game.ts");
  },
  async getPlayers() {
    return wrap(PLAYERS, "bundled/fixtures/players.ts");
  },
  async getInjuries() {
    return wrap(INJURIES, "bundled/fixtures/players.ts");
  },
  async getOdds() {
    return wrap(ODDS, "bundled/fixtures/odds.ts");
  },
  async getSentiment() {
    return wrap(SENTIMENT, "bundled/fixtures/sentiment.ts");
  },
};
