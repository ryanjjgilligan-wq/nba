import { fixtureProvider } from "./fixture";
import { buildLiveProvider } from "./live";
import type { DataProvider } from "./types";

// Browser entrypoint — uses /api/* serverless functions when available.
// Falls back to bundled fixtures otherwise. The provenance tag on every
// payload tells the UI whether the value is LIVE or FIXTURE.

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getProvider(): DataProvider {
  // In SSR / Node the env-aware provider is exposed; in the browser we route
  // through /api endpoints which read env on the server.
  if (typeof window === "undefined") {
    const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
    return buildLiveProvider(env);
  }

  return {
    async getGame() {
      const live = await fetchJSON<Awaited<ReturnType<DataProvider["getGame"]>>>("/api/game");
      if (live) return live;
      return fixtureProvider.getGame();
    },
    async getTeams() {
      return fixtureProvider.getTeams();
    },
    async getPlayers() {
      return fixtureProvider.getPlayers();
    },
    async getInjuries() {
      return fixtureProvider.getInjuries();
    },
    async getOdds() {
      const live = await fetchJSON<Awaited<ReturnType<DataProvider["getOdds"]>>>("/api/odds");
      if (live) return live;
      return fixtureProvider.getOdds();
    },
    async getSentiment() {
      return fixtureProvider.getSentiment();
    },
  };
}
