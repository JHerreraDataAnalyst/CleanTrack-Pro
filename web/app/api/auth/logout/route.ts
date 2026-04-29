import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, USER_COOKIE } from "@/lib/auth-constants";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  cookieStore.delete(USER_COOKIE);
  return NextResponse.json({ ok: true });
}
