import { TEAMS, GAME } from "../src/data/fixtures/game";
import { PLAYERS } from "../src/data/fixtures/players";
import { runEnsemble, DEFAULT_WEIGHTS } from "../src/models/ensemble";

export const config = { runtime: "edge" };

export default function handler(req: Request) {
  const u = new URL(req.url);
  const iterations = Math.min(
    50_000,
    Math.max(1_000, Number(u.searchParams.get("n") ?? "10000")),
  );
  const seed = Number(u.searchParams.get("seed") ?? "20260523");
  const marketTotal = Number(u.searchParams.get("total") ?? "213.5");
  const marketSpread = Number(u.searchParams.get("spread") ?? "-2.5");

  const verdict = runEnsemble({
    homeTeam: GAME.homeTeam,
    teams: TEAMS,
    players: PLAYERS,
    iterations,
    seed,
    weights: DEFAULT_WEIGHTS,
    marketTotal,
    marketSpread,
  });

  return new Response(JSON.stringify({ verdict }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "s-maxage=30, stale-while-revalidate=60",
    },
  });
}
