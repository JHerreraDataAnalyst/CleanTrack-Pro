"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CalendarDays, CheckCircle2, Clock3, Filter, TrendingUp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AssignmentStatus = "completed" | "absent" | "pending";

interface MonthlyHours { month: string; hours: number; }
interface Assignment {
  id: string; title: string; siteName: string;
  date: string; hours: number; status: AssignmentStatus;
}
interface HoursSummary { currentMonth: number; previousMonth: number; trend: MonthlyHours[]; }

async function http<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data as { message?: string } | null)?.message ?? "Error de servidor");
  }
  return res.json() as Promise<T>;
}

const MOCK_SUMMARY: HoursSummary = {
  currentMonth: 142, previousMonth: 128,
  trend: [
    { month: "Nov", hours: 110 }, { month: "Dic", hours: 98 },
    { month: "Ene", hours: 128 }, { month: "Feb", hours: 135 },
    { month: "Mar", hours: 120 }, { month: "Abr", hours: 128 },
    { month: "May", hours: 142 },
  ],
};

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: "1", title: "Limpieza general planta baja", siteName: "Oficinas Centro", date: "2025-04-28T08:00:00Z", hours: 6, status: "completed" },
  { id: "2", title: "Desinfección salas de reuniones", siteName: "Torre Empresarial A", date: "2025-04-25T09:00:00Z", hours: 4, status: "completed" },
  { id: "3", title: "Limpieza de cristales exterior", siteName: "Edificio Norte", date: "2025-04-22T07:30:00Z", hours: 5, status: "absent" },
  { id: "4", title: "Mantenimiento zonas comunes", siteName: "Oficinas Centro", date: "2025-04-18T08:00:00Z", hours: 7, status: "completed" },
  { id: "5", title: "Limpieza fin de semana", siteName: "Torre Empresarial A", date: "2025-03-30T08:00:00Z", hours: 8, status: "completed" },
  { id: "6", title: "Desinfección cafetería", siteName: "Edificio Norte", date: "2025-03-15T09:00:00Z", hours: 3, status: "absent" },
];

const STATUS_CFG = {
  completed: { label: "Completado", variant: "secondary" as const, icon: CheckCircle2 },
  absent: { label: "Ausente", variant: "destructive" as const, icon: XCircle },
  pending: { label: "Pendiente", variant: "outline" as const, icon: Clock3 },
};

const ALL_MONTHS = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function WorkerHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">("all");
  const [monthFilter, setMonthFilter] = useState("Todos");

  const summaryQ = useQuery<HoursSummary>({
    queryKey: ["worker-hours-summary"],
    queryFn: async () => { try { return await http<HoursSummary>("/api/worker/hours/summary"); } catch { return MOCK_SUMMARY; } },
    staleTime: 60_000,
  });

  const historyQ = useQuery<{ assignments: Assignment[] }>({
    queryKey: ["worker-assignments-history"],
    queryFn: async () => { try { return await http<{ assignments: Assignment[] }>("/api/worker/assignments/history"); } catch { return { assignments: MOCK_ASSIGNMENTS }; } },
    staleTime: 60_000,
  });

  const summary = summaryQ.data ?? MOCK_SUMMARY;
  const assignments = historyQ.data?.assignments ?? MOCK_ASSIGNMENTS;

  const trendPct = summary.previousMonth > 0
    ? (((summary.currentMonth - summary.previousMonth) / summary.previousMonth) * 100).toFixed(1)
    : "0";
  const isUp = summary.currentMonth >= summary.previousMonth;

  const filtered = useMemo(() => assignments.filter((a) => {
    const ok1 = statusFilter === "all" || a.status === statusFilter;
    const ok2 = monthFilter === "Todos" || (new Date(a.date).getMonth() + 1 === ALL_MONTHS.indexOf(monthFilter));
    return ok1 && ok2;
  }), [assignments, statusFilter, monthFilter]);

  const clearFilters = useCallback(() => { setStatusFilter("all"); setMonthFilter("Todos"); }, []);
  const hasFilters = statusFilter !== "all" || monthFilter !== "Todos";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Mi historial</h1>
        <p className="mt-1 text-sm text-muted-foreground">Horas acumuladas y registro de asignaciones pasadas.</p>
      </section>

      {/* Summary cards */}
      {summaryQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/></div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Horas este mes</CardTitle>
              <Clock3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tight text-primary">{summary.currentMonth}<span className="ml-1 text-base font-normal text-muted-foreground">h</span></div>
              <p className="mt-1 text-xs text-muted-foreground">Horas acumuladas en el mes actual</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mes anterior</CardTitle>
              <CalendarDays className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tight">{summary.previousMonth}<span className="ml-1 text-base font-normal text-muted-foreground">h</span></div>
              <p className="mt-1 text-xs text-muted-foreground">Referencia del periodo anterior</p>
            </CardContent>
          </Card>
          <Card className={isUp ? "border-green-500/20" : "border-destructive/20"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tendencia</CardTitle>
              <TrendingUp className={`h-4 w-4 ${isUp ? "text-green-500" : "text-destructive"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold tracking-tight ${isUp ? "text-green-500" : "text-destructive"}`}>{isUp ? "+" : ""}{trendPct}%</div>
              <p className="mt-1 text-xs text-muted-foreground">{isUp ? "Mejora" : "Reducción"} respecto al mes anterior</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de horas</CardTitle>
          <CardDescription>Tendencia de los últimos 7 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryQ.isLoading ? <Skeleton className="h-[240px] w-full" /> : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}h`, "Horas"]} />
                  <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#hg)" dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Historial de asignaciones</CardTitle>
              <CardDescription>{filtered.length} registro{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {ALL_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | "all")} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="all">Todos los estados</option>
                <option value="completed">Completado</option>
                <option value="absent">Ausente</option>
                <option value="pending">Pendiente</option>
              </select>
              {hasFilters && (
                <button onClick={clearFilters} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <XCircle className="h-3.5 w-3.5" />Limpiar
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading ? (
            <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No se encontraron asignaciones con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Tarea</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Horas</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const cfg = STATUS_CFG[a.status];
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={a.id} className="transition-colors hover:bg-muted/20">
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell className="text-muted-foreground">{a.siteName}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(a.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{a.hours}h</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={cfg.variant} className="gap-1">
                            <Icon className="h-3 w-3" />{cfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
