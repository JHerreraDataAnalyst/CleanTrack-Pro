"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { day: "Lun", tasks: 8 },
  { day: "Mar", tasks: 11 },
  { day: "Mie", tasks: 7 },
  { day: "Jue", tasks: 13 },
  { day: "Vie", tasks: 10 },
  { day: "Sab", tasks: 5 },
  { day: "Dom", tasks: 4 }
];

export function WeeklyActivityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad semanal</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="tasks" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
