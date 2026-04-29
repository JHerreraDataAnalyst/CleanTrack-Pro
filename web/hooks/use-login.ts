"use client";

import { useMutation } from "@tanstack/react-query";

interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "No fue posible iniciar sesion");
      }
      return response.json();
    }
  });
}
