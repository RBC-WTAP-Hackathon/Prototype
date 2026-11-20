"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DIMENSIONS, DIMENSION_META } from "@/lib/dimensions";
import type { DimensionKey, Scores } from "@/lib/types";
import { useTokens, type Tokens } from "./use-tokens";

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-64 rounded-sm border border-card-border bg-surface px-3 py-2 text-xs text-ink-2 shadow-md">
      {children}
    </div>
  );
}

const axisProps = (t: Tokens) => ({
  stroke: t.axis,
  tick: { fill: t.muted, fontSize: 11 },
  tickLine: false,
});

// ---------------- Radar ----------------

export interface RadarSeries {
  key: string;
  label: string;
  scores: Scores;
  style: "primary" | "baseline" | "ghost";
}

export function DimensionRadar({
  series,
  highlight,
  evidence,
  height = 300,
}: {
  series: RadarSeries[];
  highlight?: DimensionKey;
  evidence?: Partial<Record<DimensionKey, string>>;
  height?: number;
}) {
  const t = useTokens();
  const data = DIMENSIONS.map((d) => ({
    dim: d,
    label: DIMENSION_META[d].short,
    ...Object.fromEntries(series.map((s) => [s.key, s.scores[d]])),
  }));
  const primary = series.find((s) => s.style === "primary");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke={t.grid} />
        <PolarAngleAxis
          dataKey="label"
          tick={(props) => {
            const dim = DIMENSIONS[props.payload.index];
            const low = dim === highlight;
            return (
              <text
                x={props.x}
                y={props.y}
                textAnchor={props.textAnchor}
                dominantBaseline="central"
                fontSize={12}
                fontWeight={low ? 700 : 500}
                fill={low ? t.critical : t["ink-2"]}
              >
                {low ? "▼ " : ""}
                {props.payload.value}
              </text>
            );
          }}
        />
        <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
        {series.map((s) =>
          s.style === "primary" ? (
            <Radar
              key={s.key}
              name={s.label}
              dataKey={s.key}
              stroke={t["series-1"]}
              strokeWidth={2}
              fill={t["series-1"]}
              fillOpacity={0.22}
              dot={{ r: 4, fill: t["series-1"], stroke: t.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ) : (
            <Radar
              key={s.key}
              name={s.label}
              dataKey={s.key}
              stroke={s.style === "baseline" ? t["ink-2"] : t.muted}
              strokeWidth={s.style === "baseline" ? 1.5 : 1}
              strokeDasharray={s.style === "baseline" ? "5 4" : "2 3"}
              fill="none"
              fillOpacity={0}
              isAnimationActive={false}
            />
          ),
        )}
        <Legend
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: t["ink-2"] }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as { dim: DimensionKey } & Record<string, number>;
            const meta = DIMENSION_META[row.dim];
            const quote = evidence?.[row.dim];
            const ghost = series.find((s) => s.style === "ghost");
            const delta = primary && ghost ? row[primary.key] - row[ghost.key] : null;
            return (
              <TooltipBox>
                <div className="font-medium text-heading">{meta.label}</div>
                <div className="mb-1 text-muted">{meta.source}</div>
                {series.map((s) => (
                  <div key={s.key} className="flex justify-between gap-4">
                    <span className="text-ink-2">{s.label}</span>
                    <span className="font-medium">{row[s.key]}</span>
                  </div>
                ))}
                {delta !== null && (
                  <div className="mt-1 text-ink-2">
                    Change: {delta > 0 ? "+" : ""}
                    {delta}
                  </div>
                )}
                {quote && <div className="mt-1.5 border-t border-line pt-1.5 italic text-ink-2">“{quote}”</div>}
              </TooltipBox>
            );
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ---------------- Sentiment trend ----------------

export function SentimentTrend({
  data,
  height = 220,
}: {
  data: { week: number; sentiment: number | null }[];
  height?: number;
}) {
  const t = useTokens();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} {...axisProps(t)} />
        <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} {...axisProps(t)} axisLine={false} />
        <ReferenceLine y={0} stroke={t.axis} />
        <Line
          type="monotone"
          dataKey="sentiment"
          stroke={t["series-1"]}
          strokeWidth={2}
          connectNulls
          dot={{ r: 4, fill: t["series-1"], stroke: t.surface, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
        <Tooltip
          cursor={{ stroke: t.axis }}
          content={({ active, payload, label }) =>
            active && payload?.length && payload[0].value != null ? (
              <TooltipBox>
                <div className="font-medium text-heading">Week {label}</div>
                <div>Sentiment {Number(payload[0].value).toFixed(2)}</div>
              </TooltipBox>
            ) : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------- Topic volume ----------------

export function TopicBars({ data }: { data: { topic: string; count: number }[] }) {
  const t = useTokens();
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="topic" width={104} {...axisProps(t)} axisLine={false} />
        <Bar
          dataKey="count"
          fill={t["series-1"]}
          radius={0}
          isAnimationActive={false}
          label={{ position: "right", fill: t["ink-2"], fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: t.grid, opacity: 0.4 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox>
                <div className="font-medium text-heading">{payload[0].payload.topic}</div>
                <div>{payload[0].value} mentions, last 4 weeks</div>
              </TooltipBox>
            ) : null
          }
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
