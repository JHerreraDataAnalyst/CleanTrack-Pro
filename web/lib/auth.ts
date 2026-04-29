import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, USER_COOKIE } from "@/lib/auth-constants";
import type { Role, User } from "@/types/auth";

interface JwtPayload {
  exp?: number;
  sub?: string;
  role?: Role;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(USER_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function requireAuth(role?: Role) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const user = await getSessionUser();
  const payload = token ? decodeJwtPayload(token) : null;

  if (!token || !user || isJwtExpired(token)) redirect("/login");
  const resolvedRole = payload?.role ?? user.role;
  if (role && resolvedRole !== role) redirect("/");

  return {
    token,
    user: {
      ...user,
      role: resolvedRole
    }
  };
}
