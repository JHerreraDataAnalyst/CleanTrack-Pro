import { CheckCircle2, Clock3, Building2, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatCardItem } from "@/types/dashboard";

const ICONS = [Building2, ListTodo, CheckCircle2, Clock3];

export function StatsCards({ stats }: { stats: StatCardItem[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item, index) => {
        const Icon = ICONS[index % ICONS.length];
        return (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              {item.trend && <p className="text-xs text-muted-foreground">{item.trend}</p>}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
