export function Disclaimer() {
  return (
    <div className="panel p-3 text-[11px] text-terminal-dim leading-relaxed">
      <span className="chip bg-terminal-warn/10 text-terminal-warn mr-2">
        RESPONSIBLE USE
      </span>
      All outputs are probabilistic estimates from a statistical model, not
      guarantees. Confidence bands reflect model uncertainty, not real-world
      risk of injury, refereeing, or other unmodelled variance. Bet within a
      fixed bankroll, default to fractional-Kelly sizing (capped at 1/4 K), and
      never wager money you can't afford to lose. If gambling is causing harm,
      call 1-800-GAMBLER.
    </div>
  );
}
