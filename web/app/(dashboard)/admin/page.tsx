import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export default async function AdminPage() {
  await requireAuth("admin");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Panel Admin</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">Gestion de sedes</div>
          <div className="rounded-lg border p-4">Asignacion de personal</div>
          <div className="rounded-lg border p-4">Reportes generales</div>
        </CardContent>
      </Card>
    </div>
  );
}
