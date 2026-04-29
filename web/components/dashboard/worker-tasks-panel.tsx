"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Clock3, MapPinned } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type TaskStatus = "pending" | "in_progress" | "completed";

interface WorkerTask {
  id: string;
  title: string;
  siteName: string;
  dueAt: string;
  status: TaskStatus;
}

const schema = z.object({
  taskId: z.string().min(1, "Selecciona una tarea"),
  observations: z.string().min(10, "Escribe observaciones mas detalladas"),
  photo: z
    .custom<FileList>((value) => value instanceof FileList, "Sube una foto")
    .refine((value) => value.length > 0, "La foto es obligatoria")
});

type CheckinValues = z.infer<typeof schema>;

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? "Error de servidor");
  }
  return response.json() as Promise<T>;
}

export function WorkerTasksPanel() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["worker-tasks"],
    queryFn: () => http<WorkerTask[]>("/api/worker/tasks")
  });

  const form = useForm<CheckinValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      taskId: "",
      observations: ""
    }
  });

  const checkInMutation = useMutation({
    mutationFn: async (values: CheckinValues) => {
      const formData = new FormData();
      formData.append("observations", values.observations);
      formData.append("photo", values.photo[0]);

      return http<{ ok: boolean }>(`/api/worker/tasks/${values.taskId}/check-in`, {
        method: "POST",
        body: formData
      });
    },
    onSuccess: async () => {
      toast.success("Check-in registrado correctamente");
      form.reset({ taskId: "", observations: "" });
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ["worker-tasks"] });
    },
    onError: (error) => toast.error("No se pudo registrar el check-in", error.message)
  });

  const tasks = tasksQuery.data ?? [];
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "completed"), [tasks]);

  const onPhotoChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(files[0]));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Mis tareas asignadas</CardTitle>
          <CardDescription>Seguimiento operativo del turno actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasksQuery.isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            activeTasks.map((task) => (
              <article key={task.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{task.title}</h3>
                  <Badge variant={task.status === "in_progress" ? "secondary" : "outline"}>{task.status.replace("_", " ")}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPinned className="h-3.5 w-3.5" />
                    {task.siteName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(task.dueAt).toLocaleString("es-ES")}
                  </span>
                </div>
              </article>
            ))
          )}
          {tasksQuery.isError && <p className="text-sm text-destructive">{(tasksQuery.error as Error).message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check-in de limpieza</CardTitle>
          <CardDescription>Sube evidencia fotografica y observaciones de la tarea</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => checkInMutation.mutate(values))}>
            <div className="space-y-2">
              <Label htmlFor="taskId">Tarea</Label>
              <select
                id="taskId"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("taskId")}
              >
                <option value="">Selecciona una tarea</option>
                {activeTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title} - {task.siteName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-destructive">{form.formState.errors.taskId?.message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Foto de evidencia</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                {...form.register("photo", {
                  onChange: (event) => onPhotoChange(event.target.files)
                })}
              />
              <p className="text-xs text-destructive">{form.formState.errors.photo?.message as string | undefined}</p>
              {preview && (
                <div className="overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Previsualizacion" className="h-40 w-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea id="observations" placeholder="Describe el estado del area, incidentes o material usado." {...form.register("observations")} />
              <p className="text-xs text-destructive">{form.formState.errors.observations?.message}</p>
            </div>

            <Button className="w-full" type="submit" disabled={checkInMutation.isPending}>
              {checkInMutation.isPending ? (
                "Enviando..."
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Registrar check-in
                </>
              )}
            </Button>
            {checkInMutation.isSuccess && (
              <p className="inline-flex items-center gap-1 text-sm text-secondary">
                <CheckCircle2 className="h-4 w-4" />
                Check-in registrado correctamente
              </p>
            )}
            {checkInMutation.isError && <p className="text-sm text-destructive">{checkInMutation.error.message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
