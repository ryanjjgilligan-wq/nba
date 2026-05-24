import type { BestBet } from "../types";
import { americanToDecimal, americanToImplied } from "./devig";

// localStorage-backed log of bets the user "placed" (tracked) inside the app.
// Each entry captures the line at the time of placement; we compare against
// the CURRENT line at render time to compute Closing Line Value (CLV).
//
// CLV is the single best long-term predictor of whether your model is
// actually sharp. If you consistently beat the closing line, you win over
// time — even if any individual game outcome is random. If you consistently
// lose to the closing line, you're long-term unprofitable regardless of
// short-term wins.

const KEY = "g3oracle.placedBets.v1";

export interface PlacedBet {
  id: string;            // selection + timestamp
  selection: string;
  market: BestBet["market"];
  priceAtPlacement: number; // American
  modelProbAtPlacement: number;
  edgePctAtPlacement: number;
  kellyAtPlacement: number;
  stakeUSD: number;      // computed from bankroll × kelly at placement
  placedAtISO: string;
  gameId: string;        // for cross-referencing
}

function load(): PlacedBet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlacedBet[];
  } catch {
    return [];
  }
}

function save(bets: PlacedBet[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(bets));
  } catch {
    // localStorage full or disabled — silently drop
  }
}

export function getPlacedBets(): PlacedBet[] {
  return load();
}

export function trackBet(
  bet: BestBet,
  bankroll: number,
  gameId: string,
): PlacedBet {
  const id = `${bet.selection}-${Date.now()}`;
  const stake = Math.round(bet.kellyFraction * bankroll * 100) / 100;
  const placed: PlacedBet = {
    id,
    selection: bet.selection,
    market: bet.market,
    priceAtPlacement: bet.bookPrice,
    modelProbAtPlacement: bet.modelProb,
    edgePctAtPlacement: bet.edgePct,
    kellyAtPlacement: bet.kellyFraction,
    stakeUSD: stake,
    placedAtISO: new Date().toISOString(),
    gameId,
  };
  const all = load();
  all.push(placed);
  save(all);
  return placed;
}

export function removeBet(id: string): void {
  const all = load().filter((b) => b.id !== id);
  save(all);
}

export function clearAll(): void {
  save([]);
}

// CLV per bet: positive when you "beat the close" (got a better number
// than what the market closed at).
//
// CLV % is computed in EV-equivalent terms — if the closing implied
// probability of your side is higher than the implied prob you bet at,
// you got worse closing value (negative CLV). If lower, you beat the close.
export interface ClvComputation {
  bet: PlacedBet;
  currentPrice: number | null;
  currentImpliedProb: number | null;
  placedImpliedProb: number;
  clvPct: number | null; // % EV gained/lost vs current
  clvDirection: "BEAT" | "LOST" | "EVEN" | "UNKNOWN";
}

export function computeClv(
  bet: PlacedBet,
  currentPriceForSameSelection: number | null,
): ClvComputation {
  const placedImpliedProb = americanToImplied(bet.priceAtPlacement);
  if (currentPriceForSameSelection == null) {
    return {
      bet,
      currentPrice: null,
      currentImpliedProb: null,
      placedImpliedProb,
      clvPct: null,
      clvDirection: "UNKNOWN",
    };
  }
  const currentImpliedProb = americanToImplied(currentPriceForSameSelection);
  // CLV in % EV terms: difference in decimal payout normalized to current implied prob
  const placedDec = americanToDecimal(bet.priceAtPlacement);
  const currentDec = americanToDecimal(currentPriceForSameSelection);
  const clvPct = (placedDec - currentDec) / currentDec;

  let direction: ClvComputation["clvDirection"] = "EVEN";
  if (Math.abs(clvPct) < 0.005) direction = "EVEN";
  else if (clvPct > 0) direction = "BEAT";
  else direction = "LOST";

  return {
    bet,
    currentPrice: currentPriceForSameSelection,
    currentImpliedProb,
    placedImpliedProb,
    clvPct,
    clvDirection: direction,
  };
}
