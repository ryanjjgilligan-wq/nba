// Display aliasing layer. Internal team codes are "NYK" (away slot) and
// "CLE" (home slot). For the current game this is literally Knicks @
// Cavaliers, so the display matches the internal codes.

import type { TeamCode } from "../types";

export const DISPLAY: Record<TeamCode, {
  code: string;
  short: string;
  name: string;
  colorClass: string;
}> = {
  NYK: { code: "NYK", short: "Knicks",    name: "New York Knicks",       colorClass: "text-terminal-nyk" },
  CLE: { code: "CLE", short: "Cavaliers", name: "Cleveland Cavaliers",   colorClass: "text-terminal-cle" },
};

export function displaySelection(selection: string): string {
  return selection
    .replace(/\bNYK\b/g, DISPLAY.NYK.code)
    .replace(/\bCLE\b/g, DISPLAY.CLE.code);
}
