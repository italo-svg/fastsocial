const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

// Autenticacao (Authorization + X-Workspace-Id) e adicionada aqui no spec 008 —
// este cliente base ainda nao tem sessao para anexar.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Erro na API (${res.status}): ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}
