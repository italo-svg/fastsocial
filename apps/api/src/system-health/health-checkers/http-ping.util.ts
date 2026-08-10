// Helper compartilhado pelos checkers HTTP simples (CA da spec: "checks
// HTTP/TCP simples por serviço", nada de validação semântica profunda por
// integração). Qualquer resposta HTTP real (mesmo 4xx/401) prova que a rede
// e o servidor remoto estão de pé — só timeout/erro de rede/DNS conta como
// "down". Nunca usa POST em endpoint de geração real (evita custo/efeito
// colateral só por causa de um health check).
export async function httpPing(url: string, signal: AbortSignal, init?: RequestInit): Promise<{ up: boolean; detail?: string }> {
  try {
    const res = await fetch(url, { ...init, signal });
    return { up: true, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { up: false, detail: err instanceof Error ? err.message : "Falha de rede" };
  }
}
