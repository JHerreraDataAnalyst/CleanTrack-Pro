import { Suspense } from "react";
import type { ReactNode } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, Clock3, Globe, MapPinned } from "lucide-react";
import { headers } from "next/headers";
import { WeeklyBarChart } from "@/components/dashboard/weekly-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth";
import type { Role } from "@/types/auth";

interface StatItem {
  title: string;
  value: number;
  hint: string;
}

interface WeeklyPoint {
  day: string;
  value: number;
}

interface UpcomingItem {
  id: string;
  title: string;
  site: string;
  startAt: string;
  type: "task" | "reservation";
  status: "pending" | "confirmed" | "in_progress";
}

const ICON_BY_INDEX = [MapPinned, ClipboardList, CheckCircle2, Clock3];

type StatsResponse = Partial<{
  assignedSites: number;
  tasksToday: number;
  completedThisWeek: number;
  pending: number;
}>;

type WeeklyResponse = Array<{
  day: string;
  value: number;
}>;

type TodayTasksResponse = Array<{
  id: string;
  title: string;
  siteName?: string;
  site?: string;
  dueAt?: string;
  startAt?: string;
  type?: "task" | "reservation";
  status?: "pending" | "confirmed" | "in_progress";
}>;

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("No se pudo resolver host para llamadas internas");
  return `${protocol}://${host}`;
}

async function fetchAppApi<T>(path: string): Promise<T> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Error al cargar dashboard");
  }
  return response.json() as Promise<T>;
}

async function getStatsByRole(role: Role): Promise<StatItem[]> {
  const data = await fetchAppApi<StatsResponse>("/api/stats");
  return [
    {
      title: "Sedes Asignadas",
      value: data.assignedSites ?? 0,
      hint: role === "admin" ? "Cobertura global por sedes activas" : "Sedes del turno actual"
    },
    {
      title: "Tareas Hoy",
      value: data.tasksToday ?? 0,
      hint: role === "admin" ? "Carga operativa total del dia" : "Tu volumen operativo hoy"
    },
    {
      title: "Completadas esta semana",
      value: data.completedThisWeek ?? 0,
      hint: role === "admin" ? "Cumplimiento global semanal" : "Progreso semanal personal"
    },
    {
      title: "Pendientes",
      value: data.pending ?? 0,
      hint: role === "admin" ? "Requiere priorizacion por sede" : "Pendientes por ejecutar"
    }
  ];
}

async function getWeeklyDataByRole(_role: Role): Promise<WeeklyPoint[]> {
  const data = await fetchAppApi<WeeklyResponse>("/api/activity/weekly");
  if (!Array.isArray(data) || data.length === 0) {
    return [
      { day: "Lun", value: 0 },
      { day: "Mar", value: 0 },
      { day: "Mie", value: 0 },
      { day: "Jue", value: 0 },
      { day: "Vie", value: 0 },
      { day: "Sab", value: 0 },
      { day: "Dom", value: 0 }
    ];
  }
  return data;
}

async function getUpcomingByRole(_role: Role): Promise<UpcomingItem[]> {
  const data = await fetchAppApi<TodayTasksResponse>("/api/tasks/today");
  if (!Array.isArray(data)) return [];

  return data.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    site: item.siteName ?? item.site ?? "Sin sede",
    startAt: item.startAt ?? item.dueAt ?? new Date().toISOString(),
    type: item.type ?? "task",
    status: item.status ?? "pending"
  }));
}

function SectionSkeleton({ height = "h-[300px]" }: { height?: string }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}

async function StatsSection({ role }: { role: Role }) {
  const stats = await getStatsByRole(role);
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = ICON_BY_INDEX[index % ICON_BY_INDEX.length];
        return (
          <Card key={stat.title} className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value.toLocaleString("es-ES")}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

async function WeeklyActivitySection({ role }: { role: Role }) {
  const data = await getWeeklyDataByRole(role);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Actividad semanal</CardTitle>
        <CardDescription>{role === "admin" ? "Volumen global por sedes" : "Tu actividad por dia"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <WeeklyBarChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
}

async function UpcomingSection({ role }: { role: Role }) {
  const items = await getUpcomingByRole(role);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Proximas tareas / reservas
        </CardTitle>
        <CardDescription>Agenda operativa de las siguientes horas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No hay tareas o reservas para mostrar.</p>}
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-border/80 bg-card/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{item.title}</h3>
              <Badge variant={item.status === "pending" ? "outline" : "secondary"}>{item.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.site}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(item.startAt).toLocaleString("es-ES")}</p>
            <Badge variant="default" className="mt-2">
              {item.type === "reservation" ? "Reserva" : "Tarea"}
            </Badge>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

async function SafeSection({ children }: { children: Promise<ReactNode> }) {
  try {
    return await children;
  } catch (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error de carga</CardTitle>
          <CardDescription>No se pudo obtener informacion del backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Error inesperado"}</p>
        </CardContent>
      </Card>
    );
  }
}

function StatsFallback() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-5" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export default async function DashboardPage() {
  const { user } = await requireAuth();

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Principal</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenido, {user.name}. Vista activa: {user.role === "admin" ? "Administrador" : "Trabajador"}.
          </p>
        </div>
        {user.role === "admin" && (
          <Badge className="gap-1 rounded-md px-3 py-1.5 text-sm">
            <Globe className="h-4 w-4" />
            Metricas globales habilitadas
          </Badge>
        )}
      </section>

      <Suspense fallback={<StatsFallback />}>
        <SafeSection>{StatsSection({ role: user.role })}</SafeSection>
      </Suspense>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Suspense fallback={<SectionSkeleton height="h-[300px]" />}>
          <SafeSection>{WeeklyActivitySection({ role: user.role })}</SafeSection>
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-[300px]" />}>
          <SafeSection>{UpcomingSection({ role: user.role })}</SafeSection>
        </Suspense>
      </section>
    </div>
  );
}
