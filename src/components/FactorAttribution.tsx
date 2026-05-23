import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlayerProjection } from "../types";
import { fmtNum } from "../lib/format";

interface Props {
  projection: PlayerProjection | null;
}

export function FactorAttributionPanel({ projection }: Props) {
  if (!projection) {
    return (
      <section className="panel p-4">
        <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
          Factor Attribution
        </h2>
        <p className="text-xs text-terminal-dim">
          Select a player in the box-score table to see the waterfall of factors
          that built their projected points.
        </p>
      </section>
    );
  }

  // Build a running waterfall: each factor.delta is contribution to PTS.
  let running = 0;
  const rows = projection.factors.map((f, idx) => {
    const prev = running;
    running += f.delta;
    return {
      idx,
      name: f.factor,
      delta: Number(f.delta.toFixed(2)),
      cumulative: Number(running.toFixed(2)),
      prev,
      rationale: f.rationale,
    };
  });

  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm uppercase tracking-widest text-terminal-dim">
          Factor Attribution — {projection.name}
        </h2>
        <div className="text-xs text-terminal-dim">
          Projected PTS: <span className="text-terminal-ink font-semibold">{fmtNum(projection.pts.mean)}</span>
          {" "}· σ {fmtNum(projection.pts.std)}
        </div>
      </div>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#7d8590", fontSize: 10 }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fill: "#7d8590", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "#0f1419",
                border: "1px solid #1f2937",
                fontSize: 12,
              }}
              labelStyle={{ color: "#e6edf3" }}
              formatter={(value: number, _name, ctx) => {
                const row = ctx?.payload as (typeof rows)[number];
                return [`${value >= 0 ? "+" : ""}${value} pts`, row?.rationale ?? ""];
              }}
            />
            <Bar dataKey="delta">
              {rows.map((r) => (
                <Cell
                  key={r.idx}
                  fill={r.delta >= 0 ? "#39d353" : "#f85149"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[10px] text-terminal-dim">
        Each bar is the marginal point contribution of that factor. Hover for
        the rationale. Read left → right as the projection assembling itself
        from baseline.
      </div>
    </section>
  );
}
