import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { AUTH_COOKIE, REMEMBER_MAX_AGE_SECONDS, USER_COOKIE } from "@/lib/auth-constants";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return NextResponse.json({ message: "Credenciales invalidas" }, { status: 401 });
  }

  const data = await response.json();
  const cookieStore = await cookies();
  const remember = Boolean(body.remember);

  cookieStore.set(AUTH_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? REMEMBER_MAX_AGE_SECONDS : undefined
  });

  cookieStore.set(USER_COOKIE, JSON.stringify(data.user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? REMEMBER_MAX_AGE_SECONDS : undefined
  });

  return NextResponse.json({ ok: true });
}
