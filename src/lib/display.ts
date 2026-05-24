// Display aliasing: internal team codes are "NYK" (away slot) and "CLE"
// (home slot) — preserved through the model layer for type stability. The
// actual game being analyzed maps those slots to OKC and SAS respectively.
// This module is the single source of truth for what the UI shows.

import type { TeamCode } from "../types";

export const DISPLAY: Record<TeamCode, {
  code: string;       // 3-letter chip
  short: string;      // city
  name: string;       // full
  colorClass: string; // tailwind text-* class
}> = {
  NYK: { code: "OKC", short: "Thunder",  name: "Oklahoma City Thunder", colorClass: "text-terminal-nyk" },
  CLE: { code: "SAS", short: "Spurs",    name: "San Antonio Spurs",     colorClass: "text-terminal-cle" },
};

// Swap any "NYK" or "CLE" tokens inside a selection string (e.g. "CLE -2.5"
// → "SAS -2.5", "NYK ML" → "OKC ML"). Used by display tables; parser still
// sees the original strings.
export function displaySelection(selection: string): string {
  return selection
    .replace(/\bNYK\b/g, DISPLAY.NYK.code)
    .replace(/\bCLE\b/g, DISPLAY.CLE.code);
}
