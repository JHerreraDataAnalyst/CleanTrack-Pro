import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export default async function WorkerPage() {
  await requireAuth("worker");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Mis sedes asignadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-md border p-3">Sede Norte</div>
          <div className="rounded-md border p-3">Sede Centro</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Check-in / Check-out</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">Check-in</button>
          <button className="w-full rounded-md bg-secondary px-4 py-2 text-secondary-foreground">Check-out</button>
        </CardContent>
      </Card>
    </div>
  );
}
