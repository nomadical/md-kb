import { useState } from "react";

export type TrendPoint = { key: string; label: string; count: number };

/**
 * Dependency-free 14-day trend chart: an SVG area and line with a y-max gridline,
 * date labels, and a hover tooltip on the active point. The viewBox scales
 * responsively; point x-positions are reused (as percentages) to place the
 * HTML tooltip without measuring the DOM.
 */
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 700;
  const H = 170;
  const padL = 30;
  const padR = 6;
  const padT = 10;
  const padB = 22;
  const n = data.length;

  const max = Math.max(1, ...data.map((d) => d.count));
  const x = (i: number) =>
    n <= 1 ? padL : padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const baseline = y(0);

  const pts = data.map((d, i) => ({ ...d, px: x(i), py: y(d.count) }));
  const line = pts.map((p) => `${p.px},${p.py}`).join(" ");
  const area = `${padL},${baseline} ${line} ${x(n - 1)},${baseline}`;
  const xPct = (i: number) => (x(i) / W) * 100;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        {/* y-axis: 0 and max gridlines */}
        {[0, max].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              className="stroke-ink-line"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={padL - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="fill-ink-mut text-[9px]"
            >
              {v}
            </text>
          </g>
        ))}

        <polygon points={area} className="fill-ink-accent/15" />
        <polyline
          points={line}
          fill="none"
          className="stroke-ink-accent"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        {pts.map((p, i) => (
          <circle
            key={p.key}
            cx={p.px}
            cy={p.py}
            r={hover === i ? 4 : 2.5}
            className="fill-ink-accent"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* date labels (every other day to avoid crowding) */}
        {pts.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={p.key}
              x={p.px}
              y={H - 6}
              textAnchor="middle"
              className="fill-ink-mut text-[9px]"
            >
              {p.label}
            </text>
          ) : null,
        )}

        {/* invisible hover columns */}
        {pts.map((p, i) => (
          <rect
            key={p.key}
            x={i === 0 ? 0 : (x(i - 1) + p.px) / 2}
            y={0}
            width={
              i === 0
                ? (x(1) + padL) / 2
                : i === n - 1
                  ? W - (x(i - 1) + p.px) / 2
                  : (x(i + 1) - x(i - 1)) / 2
            }
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-ink-line bg-ink-panel px-2 py-1 text-center text-[11px] shadow-sm"
          style={{ left: `${xPct(hover)}%`, top: "1.5rem" }}
        >
          <div className="font-semibold">
            {data[hover].count} visit{data[hover].count === 1 ? "" : "s"}
          </div>
          <div className="text-ink-mut">day {data[hover].label}</div>
        </div>
      )}
    </div>
  );
}
