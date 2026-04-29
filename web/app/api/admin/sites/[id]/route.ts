import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { AUTH_COOKIE } from "@/lib/auth-constants";

function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const body = await request.json();

  const response = await fetch(`${API_URL}/api/admin/sites/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token)
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message: message || "No se pudo actualizar la sede" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;

  const response = await fetch(`${API_URL}/api/admin/sites/${id}`, {
    method: "DELETE",
    headers: {
      ...authHeader(token)
    }
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message: message || "No se pudo eliminar la sede" }, { status: response.status });
  }

  return NextResponse.json({ ok: true });
}
