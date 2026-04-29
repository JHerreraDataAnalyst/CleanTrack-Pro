import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { AUTH_COOKIE } from "@/lib/auth-constants";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const formData = await request.formData();

  const response = await fetch(`${API_URL}/api/worker/tasks/${id}/check-in`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message: message || "No se pudo registrar check-in" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
