export interface StatCardItem {
  label: string;
  value: number;
  trend?: string;
}

export interface Task {
  id: string;
  title: string;
  siteName: string;
  dueAt: string;
  status: "pending" | "completed" | "in_progress";
}

export interface Site {
  id: string;
  name: string;
  address: string;
  workersAssigned: number;
}
