"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeeklyPoint {
  day: string;
  value: number;
}

interface WeeklyBarChartProps {
  data: WeeklyPoint[];
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
        <YAxis tickLine={false} axisLine={false} className="text-xs" />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px"
          }}
          cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
        />
        <Bar dataKey="value" radius={[8, 8, 2, 2]} fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
