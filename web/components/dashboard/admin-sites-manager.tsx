"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { Site } from "@/types/dashboard";

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  address: z.string().min(5, "Direccion requerida"),
  workersAssigned: z.coerce.number().int().min(0, "Debe ser 0 o mayor")
});

type SiteValues = z.infer<typeof schema>;

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? "Error de servidor");
  }
  return response.json() as Promise<T>;
}

export function AdminSitesManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const form = useForm<SiteValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", workersAssigned: 0 }
  });

  const sitesQuery = useQuery({
    queryKey: ["admin-sites"],
    queryFn: () => http<Site[]>("/api/admin/sites")
  });

  const createMutation = useMutation({
    mutationFn: (values: SiteValues) =>
      http<Site>("/api/admin/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      }),
    onSuccess: async () => {
      toast.success("Sede creada correctamente");
      await queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      setOpen(false);
      form.reset({ name: "", address: "", workersAssigned: 0 });
    },
    onError: (error) => toast.error("No se pudo crear la sede", error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SiteValues }) =>
      http<Site>(`/api/admin/sites/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      }),
    onSuccess: async () => {
      toast.success("Sede actualizada");
      await queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      setOpen(false);
      setEditing(null);
      form.reset({ name: "", address: "", workersAssigned: 0 });
    },
    onError: (error) => toast.error("No se pudo actualizar la sede", error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      http<{ ok: boolean }>(`/api/admin/sites/${id}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      toast.success("Sede eliminada");
      await queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
    },
    onError: (error) => toast.error("No se pudo eliminar la sede", error.message)
  });

  const onCreate = () => {
    setEditing(null);
    form.reset({ name: "", address: "", workersAssigned: 0 });
    setOpen(true);
  };

  const onEdit = (site: Site) => {
    setEditing(site);
    form.reset({
      name: site.name,
      address: site.address,
      workersAssigned: site.workersAssigned
    });
    setOpen(true);
  };

  const onSubmit = (values: SiteValues) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, values });
      return;
    }
    createMutation.mutate(values);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const apiError = (sitesQuery.error as Error | null)?.message ?? createMutation.error?.message ?? updateMutation.error?.message;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestion de sedes</CardTitle>
            <CardDescription>CRUD basico para administracion de sedes</CardDescription>
          </div>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva sede
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiError && <p className="text-sm text-destructive">{apiError}</p>}
          {sitesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead>Trabajadores</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sitesQuery.data?.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>{site.address}</TableCell>
                    <TableCell>{site.workersAssigned}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => onEdit(site)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(site.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar sede" : "Crear sede"}</SheetTitle>
            <SheetDescription>Completa los datos de la sede y guarda los cambios.</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...form.register("name")} />
              <p className="text-xs text-destructive">{form.formState.errors.name?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input id="address" {...form.register("address")} />
              <p className="text-xs text-destructive">{form.formState.errors.address?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workersAssigned">Trabajadores asignados</Label>
              <Input id="workersAssigned" type="number" min={0} {...form.register("workersAssigned")} />
              <p className="text-xs text-destructive">{form.formState.errors.workersAssigned?.message}</p>
            </div>
            <Button className="w-full" type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : editing ? "Actualizar sede" : "Crear sede"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
