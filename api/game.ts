import { GAME } from "../src/data/fixtures/game";

export const config = { runtime: "edge" };

export default function handler() {
  return new Response(
    JSON.stringify({
      data: GAME,
      provenance: "FIXTURE",
      fetchedAt: new Date().toISOString(),
      source: "edge/fixtures/game.ts",
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
