import { createClient } from "./supabase/client";
import { useAuthStore } from "@/stores/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const activeWorkspaceId = useAuthStore.getState().activeWorkspaceId;
  if (activeWorkspaceId) {
    headers["X-Workspace-Id"] = activeWorkspaceId;
  }

  let res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });

  if (res.status === 401 && session?.refresh_token) {
    // Tenta renovar a sessao uma vez antes de desistir.
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
      res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
    }
  }

  if (!res.ok) {
    throw new Error(`Erro na API (${res.status}): ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}
