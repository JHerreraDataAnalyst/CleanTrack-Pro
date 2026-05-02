import { CalendarClock, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types/dashboard";

type TaskStatus = Task["status"];

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendiente", variant: "outline" },
  in_progress: { label: "En progreso", variant: "secondary" },
  completed: { label: "Completado", variant: "default" },
};

const STATUS_DOT: Record<TaskStatus, string> = {
  pending: "bg-amber-400",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

export function UpcomingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <Card className="h-full shadow-md border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Próximas tareas
        </CardTitle>
        <CardDescription>Agenda operativa inmediata</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {tasks.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay tareas programadas próximamente.
          </p>
        )}

        {tasks.map((task) => {
          const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
          const dot = STATUS_DOT[task.status] ?? STATUS_DOT.pending;

          return (
            <article
              key={task.id}
              className="group flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              {/* Title + badge row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <h3 className="text-sm font-semibold leading-snug">{task.title}</h3>
                </div>
                <Badge variant={cfg.variant} className="shrink-0 text-xs">
                  {cfg.label}
                </Badge>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPinned className="h-3 w-3" />
                  {task.siteName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {new Date(task.dueAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
