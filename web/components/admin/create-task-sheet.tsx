"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, ClipboardList, Loader2, Plus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types & schema
// ---------------------------------------------------------------------------
interface Site { id: string; name: string; address: string; }
interface Worker { id: string; name: string; email: string; }

const schema = z.object({
  siteId: z.string().min(1, "Selecciona una sede"),
  workerId: z.string().min(1, "Asigna un trabajador"),
  date: z.string().min(1, "Indica la fecha"),
  time: z.string().min(1, "Indica la hora"),
  notes: z.string().optional(),
});

type TaskValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new Error((d as { message?: string } | null)?.message ?? "Error de servidor");
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Field wrappers
// ---------------------------------------------------------------------------
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <Label htmlFor={htmlFor} className="text-sm font-medium">{children}</Label>;
}

// ---------------------------------------------------------------------------
// Searchable Select (lightweight)
// ---------------------------------------------------------------------------
interface SearchableOption { id: string; label: string; sub?: string; }

function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
}: {
  id: string;
  options: SearchableOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : options;

  return (
    <div className="space-y-1.5">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 text-sm"
      />
      <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-background">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {emptyLabel ?? "Sin resultados"}
          </p>
        ) : (
          <ul>
            {filtered.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  id={id}
                  onClick={() => { onChange(opt.id); setQuery(opt.label); }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${value === opt.id ? "bg-primary/10 font-semibold text-primary" : ""}`}
                >
                  {opt.label}
                  {opt.sub && <span className="ml-2 text-xs text-muted-foreground">{opt.sub}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value && (
        <input type="hidden" name={id} value={value} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CreateTaskSheet({ children }: { children?: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(schema),
    defaultValues: { siteId: "", workerId: "", date: "", time: "", notes: "" },
  });

  // Fetch sites & workers
  const sitesQ = useQuery<Site[]>({
    queryKey: ["admin-sites"],
    queryFn: () => http<Site[]>("/api/admin/sites"),
    enabled: open,
    staleTime: 30_000,
  });

  const workersQ = useQuery<Worker[]>({
    queryKey: ["admin-workers"],
    queryFn: () => http<Worker[]>("/api/admin/workers"),
    enabled: open,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (values: TaskValues) =>
      http<{ id: string }>("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: values.siteId,
          workerId: values.workerId,
          scheduledAt: `${values.date}T${values.time}:00`,
          notes: values.notes ?? "",
        }),
      }),
    onSuccess: async () => {
      toast.success("Tarea creada y asignada correctamente");
      reset();
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["worker-tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
    },
    onError: (err) => toast.error("No se pudo crear la tarea", err.message),
  });

  const siteOptions: SearchableOption[] = (sitesQ.data ?? []).map((s) => ({
    id: s.id, label: s.name, sub: s.address,
  }));
  const workerOptions: SearchableOption[] = (workersQ.data ?? []).map((w) => ({
    id: w.id, label: w.name, sub: w.email,
  }));

  const onSubmit = (values: TaskValues) => createMutation.mutate(values);

  const today = new Date().toISOString().split("T")[0];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva tarea
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-[480px]">
        {/* Header */}
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Asignar nueva tarea</SheetTitle>
              <SheetDescription>Completa todos los campos para programar la tarea.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator className="mb-6" />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-6">
          {/* Sede */}
          <div className="space-y-2">
            <FieldLabel htmlFor="siteId">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                Sede
              </span>
            </FieldLabel>
            {sitesQ.isLoading ? (
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            ) : (
              <Controller
                name="siteId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="siteId"
                    options={siteOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Buscar sede…"
                    emptyLabel="No hay sedes disponibles"
                  />
                )}
              />
            )}
            <FieldError msg={errors.siteId?.message} />
          </div>

          {/* Trabajador */}
          <div className="space-y-2">
            <FieldLabel htmlFor="workerId">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                Trabajador
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </span>
            </FieldLabel>
            {workersQ.isLoading ? (
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            ) : (
              <Controller
                name="workerId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="workerId"
                    options={workerOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Buscar trabajador…"
                    emptyLabel="No hay trabajadores disponibles"
                  />
                )}
              />
            )}
            <FieldError msg={errors.workerId?.message} />
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="date">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</span>
                  Fecha
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </FieldLabel>
              <Input
                id="date"
                type="date"
                min={today}
                {...register("date")}
                className="h-10"
              />
              <FieldError msg={errors.date?.message} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="time">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">4</span>
                  Hora
                </span>
              </FieldLabel>
              <Input id="time" type="time" {...register("time")} className="h-10" />
              <FieldError msg={errors.time?.message} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <FieldLabel htmlFor="notes">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">5</span>
                Notas adicionales
                <Badge variant="outline" className="text-[10px] py-0">Opcional</Badge>
              </span>
            </FieldLabel>
            <Textarea
              id="notes"
              placeholder="Instrucciones especiales, materiales necesarios, áreas prioritarias…"
              rows={4}
              {...register("notes")}
              className="resize-none text-sm"
            />
            <FieldError msg={errors.notes?.message} />
          </div>

          <div className="flex-1" />

          <SheetFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" />Crear tarea</>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
