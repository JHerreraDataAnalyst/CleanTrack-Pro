"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/constants/nav";
import type { Role } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen border-r bg-card p-3 transition-all md:block",
        collapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        {!collapsed && <span className="text-lg font-semibold text-primary">CleanTrack-Pro</span>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed((prev) => !prev)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
