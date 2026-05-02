"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Clock3, MapPinned, Plus, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTaskSheet } from "@/components/admin/create-task-sheet";
import { getAdminAssignments, type Assignment } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CalendarTask {
  id: string;
  title: string;
  siteName: string;
  workerName: string;
  scheduledAt: string; // ISO
  status: "pending" | "in_progress" | "completed";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map backend Assignment status to the lowercase variant used in the UI */
function mapStatus(s: Assignment["status"]): CalendarTask["status"] {
  if (s === "COMPLETED") return "completed";
  if (s === "IN_PROGRESS") return "in_progress";
  return "pending";
}

function assignmentToCalendarTask(a: Assignment): CalendarTask {
  return {
    id: a.id,
    title: `Limpieza en ${a.address.street}`,
    siteName: a.address.city || a.address.street,
    workerName: a.worker?.name ?? "Sin asignar",
    scheduledAt: a.date,
    status: mapStatus(a.status),
  };
}

const STATUS_CFG = {
  pending: { label: "Pendiente", color: "bg-amber-500", badge: "outline" as const },
  in_progress: { label: "En curso", color: "bg-blue-500", badge: "secondary" as const },
  completed: { label: "Completado", color: "bg-green-500", badge: "default" as const },
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function isoDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  // 0=Sun..6=Sat → convert to Mon-based
  const raw = new Date(year, month, 1).getDay();
  return raw === 0 ? 6 : raw - 1;
}

// ---------------------------------------------------------------------------
// Calendar grid
// ---------------------------------------------------------------------------
function CalendarGrid({
  year, month,
  tasksByDate,
  selectedDate,
  onSelectDate,
}: {
  year: number; month: number;
  tasksByDate: Record<string, CalendarTask[]>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstWd = getFirstWeekday(year, month);
  const todayStr = isoDateStr(new Date());

  const cells: (number | null)[] = [
    ...Array(firstWd).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_ES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const tasks = tasksByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          const dotColors = [...new Set(tasks.map((t) => STATUS_CFG[t.status].color))].slice(0, 3);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={[
                "relative flex aspect-square flex-col items-center justify-start rounded-lg p-1 transition-all",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40" : "",
                isToday && !isSelected ? "border border-primary/50 bg-primary/5 font-bold" : "",
              ].join(" ")}
            >
              <span className={`text-sm ${isSelected ? "text-primary-foreground" : isToday ? "text-primary" : ""}`}>
                {day}
              </span>
              {dotColors.length > 0 && (
                <div className="mt-auto flex gap-0.5 pb-0.5">
                  {dotColors.map((c, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${c} ${isSelected ? "opacity-80" : ""}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task detail panel
// ---------------------------------------------------------------------------
function TaskDetailPanel({
  date, tasks, onClose,
}: { date: string | null; tasks: CalendarTask[]; onClose: () => void }) {
  if (!date) return null;

  const d = new Date(date + "T12:00:00");
  const label = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h2 className="text-base font-semibold capitalize">{label}</h2>
          <p className="text-xs text-muted-foreground">{tasks.length} tarea{tasks.length !== 1 ? "s" : ""} programada{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin tareas para este día.</p>
            <p className="mt-1 text-xs text-muted-foreground">Usa el botón &quot;Nueva tarea&quot; para programar una.</p>
          </div>
        ) : (
          tasks.map((t) => {
            const cfg = STATUS_CFG[t.status];
            const time = new Date(t.scheduledAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
            return (
              <article key={t.id} className="rounded-lg border border-border/80 bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-tight">{t.title}</h3>
                  <Badge variant={cfg.badge} className="shrink-0 text-xs">{cfg.label}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="inline-flex items-center gap-1"><MapPinned className="h-3 w-3" />{t.siteName}</p>
                  <p className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{time}</p>
                  <p className="inline-flex items-center gap-1 font-medium text-foreground/80">
                    <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
                    {t.workerName}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(isoDateStr(now));

  const tasksQ = useQuery<CalendarTask[]>({
    queryKey: ["calendar-tasks", year, month],
    queryFn: async () => {
      // Build date range for the full month
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const assignments = await getAdminAssignments({ startDate, endDate });
      return assignments.map(assignmentToCalendarTask);
    },
    staleTime: 60_000,
  });

  const tasks = tasksQ.data ?? [];


  // Group by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    tasks.forEach((t) => {
      const key = isoDateStr(new Date(t.scheduledAt));
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }, [month]);

  const goToday = useCallback(() => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDate(isoDateStr(t));
  }, []);

  const totalThisMonth = tasks.filter((t) => {
    const d = new Date(t.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario de actividades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista mensual · {totalThisMonth} tarea{totalThisMonth !== 1 ? "s" : ""} en {MONTHS_ES[month]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
          <CreateTaskSheet>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nueva tarea
            </Button>
          </CreateTaskSheet>
        </div>
      </section>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_CFG).map(([, cfg]) => (
          <span key={cfg.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Calendar card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold capitalize">
                {MONTHS_ES[month]} {year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mes anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Mes siguiente">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>Haz clic en un día para ver las tareas</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksQ.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <CalendarGrid
                year={year}
                month={month}
                tasksByDate={tasksByDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className={selectedDate ? "border-primary/20" : ""}>
          <CardContent className="pt-6">
            {selectedDate ? (
              <TaskDetailPanel
                date={selectedDate}
                tasks={selectedTasks}
                onClose={() => setSelectedDate(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Selecciona un día</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Las tareas del día aparecerán aquí.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
