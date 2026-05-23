import type { GameContext, TeamBaseline } from "../../types";

export const GAME: GameContext = {
  id: "2026-ECF-G3-NYK-CLE",
  tipoffISO: "2026-05-23T20:00:00-04:00",
  venue: "Rocket Arena, Cleveland",
  homeTeam: "CLE",
  awayTeam: "NYK",
  seriesText: "2026 ECF — Knicks lead 2-0 — Cavaliers must-win Game 3",
  refCrew: ["Scott Foster", "Marc Davis", "Tony Brothers"],
  travelDays: 1,
  notes: [
    "Knicks on a 9-game playoff win streak.",
    "Cavaliers 6-1 at home this postseason, 1-5 on the road; +10 ppg at home.",
    "Knicks Game 2 starters posted +27.7 net rating; +18 in the paint, 32 assists.",
    "Cleveland blew a 22-point Game 2 lead — fuel-or-scar narrative is live.",
    "Mike Brown coaching for NYK; timeout-management edge has tracked all postseason.",
  ],
};

export const TEAMS: Record<"NYK" | "CLE", TeamBaseline> = {
  NYK: {
    code: "NYK",
    name: "New York Knicks",
    pace: 98.4,
    ortg: 117.8,
    drtg: 112.1,
    homeOrtg: 119.3,
    awayOrtg: 116.4,
    homeDrtg: 110.8,
    awayDrtg: 113.5,
    threePtRate: 0.39,
    recordWinPct: 53 / 82,
    restDays: 2,
  },
  CLE: {
    code: "CLE",
    name: "Cleveland Cavaliers",
    pace: 97.6,
    ortg: 119.1,
    drtg: 110.9,
    // Home/away split is the defining signal of this matchup:
    homeOrtg: 122.4,
    awayOrtg: 112.7,
    homeDrtg: 108.2,
    awayDrtg: 115.1,
    threePtRate: 0.44,
    recordWinPct: 52 / 82,
    restDays: 2,
  },
};
