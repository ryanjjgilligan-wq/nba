export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

// Inverse error function approximation
function erfInv(x: number): number {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const part1 = 2 / (Math.PI * a) + ln / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(part1 * part1 - ln / a) - part1);
}

// Standard normal CDF
export function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  // Abramowitz & Stegun
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normInv(p: number): number {
  return Math.SQRT2 * erfInv(2 * p - 1);
}

export function pNormalAbove(threshold: number, mu: number, sigma: number): number {
  if (sigma <= 0) return mu > threshold ? 1 : 0;
  return 1 - normCdf((threshold - mu) / sigma);
}

export function pNormalBelow(threshold: number, mu: number, sigma: number): number {
  return 1 - pNormalAbove(threshold, mu, sigma);
}
