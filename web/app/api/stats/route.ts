import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { AUTH_COOKIE } from "@/lib/auth-constants";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;

  const response = await fetch(`${API_URL}/api/stats`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message: message || "No se pudieron cargar estadisticas" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
