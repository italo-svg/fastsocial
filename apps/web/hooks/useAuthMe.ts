"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface AuthMeResponse {
  user: { id: string; email: string; name: string; isPlatformSuperAdmin: boolean };
  workspaces: { id: string; name: string; role: string }[];
}

export function useAuthMe() {
  return useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiFetch<AuthMeResponse>("/auth/me"),
    retry: false,
  });
}
