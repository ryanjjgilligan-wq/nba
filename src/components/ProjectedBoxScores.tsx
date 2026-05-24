import type { PlayerProjection } from "../types";
import { fmtNum } from "../lib/format";

interface Props {
  players: PlayerProjection[];
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
}

export function ProjectedBoxScores({ players, selectedPlayerId, onSelect }: Props) {
  const nyk = players.filter((p) => p.team === "NYK");
  const cle = players.filter((p) => p.team === "CLE");

  return (
    <section className="panel p-4">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-3">
        Projected Box Scores
      </h2>
      <div className="grid lg:grid-cols-2 gap-4">
        <TeamTable
          label="Oklahoma City Thunder"
          accent="nyk"
          players={nyk}
          selectedPlayerId={selectedPlayerId}
          onSelect={onSelect}
        />
        <TeamTable
          label="San Antonio Spurs"
          accent="cle"
          players={cle}
          selectedPlayerId={selectedPlayerId}
          onSelect={onSelect}
        />
      </div>
      <div className="text-[11px] text-terminal-dim mt-3">
        Each cell shows the 50th percentile projection with the 25th–75th
        percentile credible band underneath. Click a row to load its full
        factor-attribution waterfall.
      </div>
    </section>
  );
}

function TeamTable({
  label,
  accent,
  players,
  selectedPlayerId,
  onSelect,
}: {
  label: string;
  accent: "nyk" | "cle";
  players: PlayerProjection[];
  selectedPlayerId: string | null;
  onSelect: (id: string) => void;
}) {
  const colorCls = accent === "nyk" ? "text-terminal-nyk" : "text-terminal-cle";
  return (
    <div>
      <div className={`text-sm font-semibold mb-1 ${colorCls}`}>{label}</div>
      <table className="terminal">
        <thead>
          <tr>
            <th>Player</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>3PM</th>
            <th>STL</th>
            <th>BLK</th>
            <th>TO</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr
              key={p.playerId}
              className={`cursor-pointer hover:bg-terminal-border/40 ${
                selectedPlayerId === p.playerId ? "bg-terminal-border/50" : ""
              }`}
              onClick={() => onSelect(p.playerId)}
            >
              <td className="font-semibold">{p.name}</td>
              <td>{fmtNum(p.minutes, 0)}</td>
              <Cell d={p.pts} />
              <Cell d={p.reb} />
              <Cell d={p.ast} />
              <Cell d={p.tpm} />
              <Cell d={p.stl} />
              <Cell d={p.blk} />
              <Cell d={p.to} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ d }: { d: { p25: number; p50: number; p75: number } }) {
  return (
    <td>
      <div>{fmtNum(d.p50, 1)}</div>
      <div className="text-[9px] text-terminal-dim leading-none">
        {fmtNum(d.p25, 1)} · {fmtNum(d.p75, 1)}
      </div>
    </td>
  );
}
