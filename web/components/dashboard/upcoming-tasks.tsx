import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types/dashboard";

export function UpcomingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tareas proximas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-lg border p-3">
            <p className="font-medium">{task.title}</p>
            <p className="text-sm text-muted-foreground">{task.siteName}</p>
            <p className="text-xs text-muted-foreground">{new Date(task.dueAt).toLocaleString("es-ES")}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
