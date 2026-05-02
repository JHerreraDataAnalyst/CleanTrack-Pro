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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyPoint {
  day: string;
  value: number;
}

interface Props {
  data?: WeeklyPoint[];
}

// Custom Tooltip component for dark, rounded style
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
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-foreground">
        {payload[0].value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">tareas</span>
      </p>
    </div>
  );
}

export function WeeklyActivityChart({ data = [] }: Props) {
  return (
    <Card className="h-full shadow-md border-border/50">
      <CardHeader>
        <CardTitle>Actividad semanal</CardTitle>
        <CardDescription>Volumen de tareas por día</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#barGrad)"
              maxBarSize={52}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
