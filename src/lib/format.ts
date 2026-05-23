export const fmtPct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
export const fmtSign = (x: number, digits = 1) =>
  `${x >= 0 ? "+" : ""}${x.toFixed(digits)}`;
export const fmtNum = (x: number, digits = 1) => x.toFixed(digits);
export const fmtAmerican = (x: number) => (x > 0 ? `+${x}` : `${x}`);
