import type { SentimentItem } from "../../types";

// Reporter sentiment is intentionally low-weight (cap ±4% per player). Without
// a wired X API these are representative items, used to demonstrate the
// pipeline. Wire X_BEARER_TOKEN to replace with live signal.
export const SENTIMENT: SentimentItem[] = [
  {
    id: "s1",
    source: "Beat reporter",
    author: "@MWAndrews_AP (Beat — OKC)",
    credibility: 0.84,
    ts: "2026-05-24T13:00:00-05:00",
    text: "OKC shootaround had SGA fully participating; he's described the game plan as 'unchanged' from Game 2.",
    topic: "narrative",
    team: "NYK",
    polarity: 0.18,
    weightOnProjection: 0.012,
  },
  {
    id: "s2",
    source: "X / Insider",
    author: "@PaulGarciaPCH (SAS)",
    credibility: 0.86,
    ts: "2026-05-24T12:30:00-05:00",
    text: "Wemby reports 'feeling good' after extra recovery; expects normal minutes load tonight.",
    topic: "injury",
    team: "CLE",
    polarity: 0.22,
    weightOnProjection: 0.015,
  },
  {
    id: "s3",
    source: "X / Insider",
    author: "@JoeVardon",
    credibility: 0.88,
    ts: "2026-05-24T11:10:00-05:00",
    text: "Castle expected to start; SAS leaning into the lineup that gave OKC trouble in Game 1.",
    topic: "lineup",
    team: "CLE",
    polarity: 0.10,
    weightOnProjection: 0.018,
  },
];
