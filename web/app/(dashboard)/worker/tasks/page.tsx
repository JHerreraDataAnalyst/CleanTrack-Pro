import { WorkerTasksPanel } from "@/components/dashboard/worker-tasks-panel";
import { requireAuth } from "@/lib/auth";

export default async function WorkerTasksPage() {
  await requireAuth("worker");
  return <WorkerTasksPanel />;
}
