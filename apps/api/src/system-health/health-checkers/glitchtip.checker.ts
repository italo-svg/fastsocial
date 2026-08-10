import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

const DEFAULT_GLITCHTIP_URL = "http://glitchtip-web:8000";

@Injectable()
export class GlitchtipChecker implements HealthChecker {
  readonly name = "glitchtip";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    // GLITCHTIP_DSN é o sinal de que o rastreamento de erros está habilitado
    // (spec 044) — sem ele, ErrorTrackingService já roda em modo no-op, então
    // tratamos como "não configurado" em vez de fingir monitorar algo inativo.
    if (!this.config.get<string>("GLITCHTIP_DSN")) {
      return runWithTimeout(this.name, async () => ({ status: "not_configured" }));
    }
    const url = this.config.get<string>("GLITCHTIP_URL") ?? DEFAULT_GLITCHTIP_URL;
    return runWithTimeout(this.name, async (signal) => {
      const { up, detail } = await httpPing(url, signal);
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
