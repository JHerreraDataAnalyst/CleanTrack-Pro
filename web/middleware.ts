import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, USER_COOKIE } from "@/lib/auth-constants";
import type { Role, User } from "@/types/auth";

interface JwtPayload {
  exp?: number;
  role?: Role;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

function getUser(request: NextRequest): User | null {
  const raw = request.cookies.get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function clearAndRedirectLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(USER_COOKIE);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboardArea = pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/worker");
  if (!isDashboardArea) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = getUser(request);
  const payload = token ? decodeJwtPayload(token) : null;
  const role = payload?.role ?? user?.role;

  if (!token || isExpired(token) || !role) {
    return clearAndRedirectLogin(request);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/worker") && role !== "worker") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/worker/:path*"]
};
