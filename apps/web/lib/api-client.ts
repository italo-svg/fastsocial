import { createClient } from "./supabase/client";
import { useAuthStore } from "@/stores/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

// Extrai a mensagem humana de dentro do corpo JSON de erro do NestJS
// (`{"message": "...", "error": "...", "statusCode": ...}`), em vez de expor
// o "Erro na API (400): {...}" bruto na UI — usado onde a tela precisa
// mostrar o motivo exato vindo da API (ex: spec 037 CA-02).
export function extractApiErrorMessage(err: unknown, fallback = "Ocorreu um erro."): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/^Erro na API \(\d+\): ([\s\S]*)$/);
  if (!match) return err.message;
  try {
    const body = JSON.parse(match[1]) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // corpo do erro nao era JSON — cai no texto bruto abaixo.
  }
  return match[1];
}
