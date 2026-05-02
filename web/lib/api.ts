/**
 * api.ts — Cliente HTTP centralizado para CleanTrack-Pro
 *
 * Lee la URL base de NEXT_PUBLIC_API_URL (.env.local).
 * El token JWT se pasa explícitamente en cada llamada que lo requiera
 * (obtenido del cookie de sesión mediante getToken() del lado del cliente).
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const API_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Shared types (mirror backend response shapes)
// ---------------------------------------------------------------------------

export interface Address {
  id: string;
  street: string;
  city: string;
  postalCode?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
}

export interface Assignment {
  id: string;
  workerId: string;
  addressId: string;
  date: string; // ISO
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  address: Address;
  worker?: { id: string; name: string };
}

export interface CalendarDay {
  date: string; // "yyyy-MM-dd"
  totalHours: number;
  assignments: CalendarAssignment[];
}

export interface CalendarAssignment {
  id: string;
  address: Address;
  addressId: string;
  worker: { id: string; name: string };
  date: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  totalHours: number;
  workRecordsCount: number;
}

export interface WorkerStatsResponse {
  totalHours: number;
  punctualityIndex: number;
  completedServices: number;
  recentHistory: {
    id: string;
    roomName: string;
    address: string;
    hours: number;
    date: string;
    createdAt: string;
  }[];
  period: { month: number; year: number };
}

export interface DashboardStats {
  assignedSites: number;
  tasksToday: number;
  completedThisWeek: number;
  pending: number;
}

export interface WeeklyActivityPoint {
  day: string;
  value: number;
}

export interface TodayTask {
  id: string;
  title: string;
  siteName: string;
  dueAt: string;
  type: "task" | "reservation";
  status: "pending" | "confirmed" | "in_progress";
}

export interface CreateAssignmentPayload {
  workerId: string;
  addressId: string;
  date: string; // "yyyy-MM-dd"
}

export interface WorkRecord {
  id: string;
  hours: number;
  isVerified: boolean;
  isLate: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

interface FetchOptions extends RequestInit {
  /** JWT token — pass when the endpoint is protected (requireAuth middleware) */
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body as { error?: string; message?: string } | null)?.error ??
      (body as { error?: string; message?: string } | null)?.message ??
      `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export { apiFetch };

// ---------------------------------------------------------------------------
// ── WEB DASHBOARD (no auth required — proxy routes in Next.js /api) ─────────
// These endpoints are called from Next.js Server Components via internal
// /api routes. They talk to the backend through the Next.js proxy.
// ---------------------------------------------------------------------------

/**
 * GET /api/stats
 * Global dashboard KPI cards. Called server-side via Next.js /api proxy.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>(`${API_URL}/api/stats`);
}

/**
 * GET /api/activity/weekly
 * Weekly bar chart data.
 */
export async function getWeeklyActivity(): Promise<WeeklyActivityPoint[]> {
  return apiFetch<WeeklyActivityPoint[]>(`${API_URL}/api/activity/weekly`);
}

/**
 * GET /api/tasks/today
 * Upcoming tasks panel.
 */
export async function getTasksToday(): Promise<TodayTask[]> {
  return apiFetch<TodayTask[]>(`${API_URL}/api/tasks/today`);
}

// ---------------------------------------------------------------------------
// ── WORKER ROUTES (/api/worker/*) ───────────────────────────────────────────
// ---------------------------------------------------------------------------

/**
 * GET /api/worker/my-sites?workerId=<id>
 * Returns the list of addresses (sedes) assigned to a worker.
 */
export async function getWorkerSites(workerId: string): Promise<Address[]> {
  return apiFetch<Address[]>(
    `${API_URL}/api/worker/my-sites?workerId=${encodeURIComponent(workerId)}`
  );
}

/**
 * GET /api/worker/stats/me?workerId=<id>&month=<0-11>&year=<yyyy>
 * Personal stats: total hours, punctuality, completed services, recent history.
 * month is 0-based (0 = January).
 */
export async function getWorkerPersonalStats(
  workerId: string,
  month?: number,
  year?: number
): Promise<WorkerStatsResponse> {
  const params = new URLSearchParams({ workerId });
  if (month !== undefined) params.set("month", String(month));
  if (year !== undefined) params.set("year", String(year));
  return apiFetch<WorkerStatsResponse>(
    `${API_URL}/api/worker/stats/me?${params.toString()}`
  );
}

/**
 * GET /api/work-records/my-history?workerId=<id>
 * Full assignment history list for the worker history page table.
 */
export async function getWorkerHistory(workerId: string): Promise<WorkRecord[]> {
  return apiFetch<WorkRecord[]>(
    `${API_URL}/api/work-records/my-history?workerId=${encodeURIComponent(workerId)}`
  );
}

/**
 * GET /api/worker/assignments/:id/validate-closure
 * Validates if an assignment can be closed (requires JWT).
 */
export async function validateAssignmentClosure(
  assignmentId: string,
  token: string
): Promise<{ canClose: boolean; reason?: string }> {
  return apiFetch<{ canClose: boolean; reason?: string }>(
    `${API_URL}/api/worker/assignments/${assignmentId}/validate-closure`,
    { token }
  );
}

/**
 * POST /api/worker/assignments/:id/close
 * Closes an assignment (requires JWT).
 */
export async function closeAssignment(
  assignmentId: string,
  token: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `${API_URL}/api/worker/assignments/${assignmentId}/close`,
    { method: "POST", token }
  );
}

// ---------------------------------------------------------------------------
// ── ADMIN ROUTES (/api/admin/*) ─────────────────────────────────────────────
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/employees
 * All workers (role: TRABAJADOR) for the assignment form select.
 */
export async function getAdminEmployees(): Promise<Employee[]> {
  return apiFetch<Employee[]>(`${API_URL}/api/admin/employees`);
}

/**
 * GET /api/admin/addresses
 * All sites/addresses for the assignment form select.
 */
export async function getAdminAddresses(): Promise<Address[]> {
  return apiFetch<Address[]>(`${API_URL}/api/admin/addresses`);
}

/**
 * GET /api/admin/assignments?startDate=<iso>&endDate=<iso>&userId=<id>
 * Admin list of assignments, optionally filtered by date range and worker.
 */
export async function getAdminAssignments(opts?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}): Promise<Assignment[]> {
  const params = new URLSearchParams();
  if (opts?.startDate) params.set("startDate", opts.startDate);
  if (opts?.endDate) params.set("endDate", opts.endDate);
  if (opts?.userId) params.set("userId", opts.userId);
  const qs = params.toString();
  return apiFetch<Assignment[]>(
    `${API_URL}/api/admin/assignments${qs ? `?${qs}` : ""}`
  );
}

/**
 * POST /api/admin/assignments
 * Creates a new assignment. Body: { workerId, addressId, date }.
 */
export async function createAdminAssignment(
  payload: CreateAssignmentPayload
): Promise<Assignment> {
  return apiFetch<Assignment>(`${API_URL}/api/admin/assignments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/admin/assignments/:id
 * Deletes an assignment by ID.
 */
export async function deleteAdminAssignment(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`${API_URL}/api/admin/assignments/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// ── CALENDAR ROUTE (/api/calendar/*) — requires JWT ─────────────────────────
// ---------------------------------------------------------------------------

/**
 * GET /api/calendar/assignments?startDate=<iso>&endDate=<iso>
 * Returns calendar data grouped by date. Requires JWT.
 * - Admin: sees all assignments.
 * - Worker: sees only their own.
 */
export async function getCalendarAssignments(
  token: string,
  opts?: { startDate?: string; endDate?: string }
): Promise<CalendarDay[]> {
  const params = new URLSearchParams();
  if (opts?.startDate) params.set("startDate", opts.startDate);
  if (opts?.endDate) params.set("endDate", opts.endDate);
  const qs = params.toString();
  return apiFetch<CalendarDay[]>(
    `${API_URL}/api/calendar/assignments${qs ? `?${qs}` : ""}`,
    { token }
  );
}
