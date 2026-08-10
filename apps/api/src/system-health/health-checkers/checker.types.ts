export type ServiceStatus = "up" | "down" | "not_configured";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  lastCheckedAt: string;
  detail?: string;
}

export interface HealthChecker {
  readonly name: string;
  check(): Promise<ServiceHealth>;
}

const DEFAULT_TIMEOUT_MS = 3000;

// Todo checker usa isto pra nunca deixar uma dependencia lenta travar o
// agregado inteiro (CA da spec: timeout de 3s por checker, roda em paralelo).
// O signal e passado pra quem sabe usar (fetch cancela de verdade); pra quem
// nao sabe (ioredis .ping(), Prisma $queryRaw), o Promise.race abaixo ainda
// limita o tempo de espera da RESPOSTA — a chamada original pode continuar
// rodando em segundo plano, mas isso nao trava o agregado.
export async function runWithTimeout(
  name: string,
  fn: (signal: AbortSignal) => Promise<Omit<ServiceHealth, "name" | "latencyMs" | "lastCheckedAt">>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ServiceHealth> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const timeoutPromise = new Promise<Omit<ServiceHealth, "name" | "latencyMs" | "lastCheckedAt">>((resolve) => {
    controller.signal.addEventListener("abort", () => resolve({ status: "down", detail: "Timeout (3s)" }));
  });

  try {
    const result = await Promise.race([fn(controller.signal), timeoutPromise]);
    return { name, latencyMs: Date.now() - start, lastCheckedAt: new Date().toISOString(), ...result };
  } catch (err) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - start,
      lastCheckedAt: new Date().toISOString(),
      detail: err instanceof Error ? err.message : "Falha desconhecida",
    };
  } finally {
    clearTimeout(timer);
  }
}
