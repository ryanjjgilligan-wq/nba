// Convert American odds → implied probability, then de-vig two-sided markets.

export function americanToImplied(american: number): number {
  if (american === 0) return 0.5;
  if (american > 0) return 100 / (american + 100);
  return -american / (-american + 100);
}

export function americanToDecimal(american: number): number {
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / -american;
}

// De-vig a pair using multiplicative method (normalize so sum = 1).
export function devigPair(a: number, b: number): { a: number; b: number } {
  const sum = a + b;
  if (sum <= 0) return { a, b };
  return { a: a / sum, b: b / sum };
}

// Expected value per 1 unit risked
export function evPerUnit(modelProb: number, american: number): number {
  const dec = americanToDecimal(american);
  return modelProb * (dec - 1) - (1 - modelProb);
}

// Plain Kelly fraction (bankroll proportion). Can be negative if no edge.
export function kellyFraction(modelProb: number, american: number): number {
  const dec = americanToDecimal(american);
  const b = dec - 1;
  const q = 1 - modelProb;
  if (b <= 0) return 0;
  return (modelProb * b - q) / b;
}

// Responsible default: cap at fractional Kelly. Clamp negatives to 0.
export function fractionalKelly(
  modelProb: number,
  american: number,
  cap = 0.25,
): number {
  const raw = kellyFraction(modelProb, american);
  if (raw <= 0) return 0;
  return Math.min(raw * cap, cap);
}
