import type { SentimentItem } from "../../types";

// Reporter sentiment — intentionally low-weight (cap ±4% per player). Without
// a wired X API these are representative items. Wire X_BEARER_TOKEN to swap.
export const SENTIMENT: SentimentItem[] = [
  {
    id: "s1",
    source: "Beat reporter",
    author: "@FredKatz (Knicks)",
    credibility: 0.90,
    ts: "2026-05-25T13:00:00-04:00",
    text: "Knicks shootaround: starters in full participation; Brunson moving normally after rolled ankle scare in Game 3.",
    topic: "injury",
    team: "NYK",
    polarity: 0.20,
    weightOnProjection: 0.014,
  },
  {
    id: "s2",
    source: "Beat reporter",
    author: "@ChrisFedor (Cavs)",
    credibility: 0.86,
    ts: "2026-05-25T12:30:00-04:00",
    text: "Cavs film session emphasized transition defense after Game 3 — coaching staff insistent the road blueprint hasn't changed.",
    topic: "narrative",
    team: "CLE",
    polarity: 0.12,
    weightOnProjection: 0.012,
  },
  {
    id: "s3",
    source: "X / Insider",
    author: "@JoeVardon",
    credibility: 0.88,
    ts: "2026-05-25T11:10:00-04:00",
    text: "Cavs leaning toward Wade starting again — matchup minutes vs KAT outweigh the Allen lineup last night.",
    topic: "lineup",
    team: "CLE",
    polarity: 0.05,
    weightOnProjection: 0.018,
  },
];
