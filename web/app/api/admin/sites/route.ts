import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { AUTH_COOKIE } from "@/lib/auth-constants";

function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;

  const response = await fetch(`${API_URL}/api/admin/sites`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token)
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message: message || "No se pudieron cargar sedes" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const body = await request.json();

  const response = await fetch(`${API_URL}/api/admin/sites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token)
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message: message || "No se pudo crear la sede" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data, { status: 201 });
}
