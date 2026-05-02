import { Building2, CalendarRange, ClipboardList, History, LayoutDashboard, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";
import type { Role } from "@/types/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "worker"] },
  { href: "/admin", label: "Panel Admin", icon: Settings, roles: ["admin"] },
  { href: "/admin/sites", label: "Sedes", icon: Building2, roles: ["admin"] },
  { href: "/admin/calendar", label: "Calendario", icon: CalendarRange, roles: ["admin"] },
  { href: "/worker", label: "Panel Trabajador", icon: Users, roles: ["worker"] },
  { href: "/worker/tasks", label: "Mis Tareas", icon: ClipboardList, roles: ["worker"] },
  { href: "/worker/history", label: "Mi Historial", icon: History, roles: ["worker"] },
];
