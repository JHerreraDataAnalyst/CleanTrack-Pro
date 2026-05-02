import { Building2, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatCardItem } from "@/types/dashboard";

const ICONS = [Building2, ListTodo, CheckCircle2, Clock3];

// Gradient pairs (from → to) — one per card slot
const GRADIENTS = [
  "from-sky-500/10 to-primary/5",
  "from-violet-500/10 to-purple-500/5",
  "from-emerald-500/10 to-secondary/5",
  "from-amber-500/10 to-orange-500/5",
];

const ICON_COLORS = [
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
];

export function StatsCards({ stats }: { stats: StatCardItem[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item, index) => {
        const Icon = ICONS[index % ICONS.length];
        const gradient = GRADIENTS[index % GRADIENTS.length];
        const iconColor = ICON_COLORS[index % ICON_COLORS.length];

        return (
          <Card
            key={item.label}
            className={`bg-gradient-to-br ${gradient} shadow-md border-border/50 transition-shadow hover:shadow-lg`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                {item.label}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold tracking-tight">
                {item.value.toLocaleString("es-ES")}
              </div>
              {item.trend && (
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {item.trend}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
