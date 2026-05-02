"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface WeeklyPoint {
  day: string;
  value: number;
}

interface WeeklyBarChartProps {
  data: WeeklyPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-popover px-4 py-2.5 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-foreground">
        {payload[0].value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">tareas</span>
      </p>
    </div>
  );
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="wbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          allowDecimals={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "hsl(var(--primary) / 0.07)", radius: 6 }}
        />
        <Bar
          dataKey="value"
          radius={[6, 6, 0, 0]}
          fill="url(#wbGrad)"
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
