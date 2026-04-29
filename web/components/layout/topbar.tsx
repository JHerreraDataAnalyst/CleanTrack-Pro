"use client";

import { LogOut, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function Topbar() {
  const { setTheme } = useTheme();
  const router = useRouter();

  const onLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Sesion cerrada");
      router.replace("/login");
    } catch {
      toast.error("No se pudo cerrar la sesion");
    }
  };

  return (
    <header className="flex h-16 items-center justify-end gap-2 border-b bg-background px-4">
      <Button variant="outline" size="icon" onClick={() => setTheme("dark")}>
        <Moon className="h-4 w-4" />
      </Button>
      <Button variant="destructive" size="sm" onClick={onLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Salir
      </Button>
    </header>
  );
}
