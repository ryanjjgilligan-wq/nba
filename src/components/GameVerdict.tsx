import type { GameVerdict, TeamCode } from "../types";
import { fmtNum, fmtPct, fmtSign } from "../lib/format";
import { DISPLAY } from "../lib/display";

interface Props {
  verdict: GameVerdict;
  homeTeam: "NYK" | "CLE";
}

export function GameVerdictCard({ verdict, homeTeam }: Props) {
  const awayTeam = homeTeam === "NYK" ? "CLE" : "NYK";
  const winner =
    verdict.homeWinProb >= verdict.awayWinProb ? homeTeam : awayTeam;
  const winnerProb = Math.max(verdict.homeWinProb, verdict.awayWinProb);

  return (
    <section className="panel p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
          Game Verdict
        </h2>
        <div className="text-xs text-terminal-dim">
          Confidence: model ensemble (Monte Carlo + regression)
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <ScoreBlock
            team={DISPLAY[awayTeam].code}
            label="Away"
            mean={verdict.awayScore.mean}
            p25={verdict.awayScore.p25}
            p75={verdict.awayScore.p75}
            colorClass={DISPLAY[awayTeam].colorClass}
          />
          <ScoreBlock
            team={DISPLAY[homeTeam].code}
            label="Home"
            mean={verdict.homeScore.mean}
            p25={verdict.homeScore.p25}
            p75={verdict.homeScore.p75}
            colorClass={DISPLAY[homeTeam].colorClass}
          />
        </div>
        <div className="bg-terminal-bg/40 rounded p-3 flex flex-col justify-center">
          <div className="text-xs text-terminal-dim uppercase tracking-widest">
            Win Probability
          </div>
          <div className="mt-1 text-2xl font-bold">
            <span className={DISPLAY[winner as TeamCode].colorClass}>
              {DISPLAY[winner as TeamCode].code}
            </span>{" "}
            {fmtPct(winnerProb)}
          </div>
          <div className="text-[11px] text-terminal-dim mt-1">
            {DISPLAY[awayTeam].code} {fmtPct(verdict.awayWinProb)} · {DISPLAY[homeTeam].code}{" "}
            {fmtPct(verdict.homeWinProb)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-terminal-bg/40 rounded p-3">
          <div className="text-[11px] text-terminal-dim uppercase tracking-widest">
            Projected Total
          </div>
          <div className="text-lg font-semibold">
            {fmtNum(verdict.total.mean)}{" "}
            <span className="text-xs text-terminal-dim font-normal">
              (P25 {fmtNum(verdict.total.p25)} · P75 {fmtNum(verdict.total.p75)})
            </span>
          </div>
        </div>
        <div className="bg-terminal-bg/40 rounded p-3">
          <div className="text-[11px] text-terminal-dim uppercase tracking-widest">
            Projected Margin (Away − Home)
          </div>
          <div className="text-lg font-semibold">
            {fmtSign(verdict.margin.mean)}{" "}
            <span className="text-xs text-terminal-dim font-normal">
              (σ {fmtNum(verdict.margin.std)})
            </span>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-terminal-dim grid grid-cols-2 gap-3">
        {verdict.ensembleComponents.map((c) => (
          <div
            key={c.name}
            className="border border-terminal-border rounded p-2 leading-tight"
          >
            <div className="text-terminal-ink text-xs font-semibold">
              {c.name}
              <span className="ml-2 chip bg-terminal-info/10 text-terminal-info">
                w {fmtNum(c.weight, 2)}
              </span>
            </div>
            <div>Home WP {fmtPct(c.homeWinProb)} · Total {fmtNum(c.projTotal)} · Margin {fmtSign(c.projMargin)}</div>
            <div className="text-[10px]">{c.notes}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreBlock({
  team,
  label,
  mean,
  p25,
  p75,
  colorClass,
}: {
  team: string;
  label: string;
  mean: number;
  p25: number;
  p75: number;
  colorClass: string;
}) {
  return (
    <div className="bg-terminal-bg/40 rounded p-3">
      <div className="text-[11px] text-terminal-dim uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-3xl font-bold ${colorClass}`}>
        {team} {Math.round(mean)}
      </div>
      <div className="text-[11px] text-terminal-dim mt-1">
        P25 {Math.round(p25)} · P75 {Math.round(p75)}
      </div>
    </div>
  );
}
