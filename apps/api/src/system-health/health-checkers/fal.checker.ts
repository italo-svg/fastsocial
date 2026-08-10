import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

@Injectable()
export class FalChecker implements HealthChecker {
  readonly name = "fal";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const apiKey = this.config.get<string>("FAL_API_KEY");
    if (!apiKey) {
      return runWithTimeout(this.name, async () => ({ status: "not_configured" }));
    }
    return runWithTimeout(this.name, async (signal) => {
      // GET na raiz do domínio, nunca POST no endpoint de geração real
      // (fal-flux.provider.ts) — isso dispararia uma geração de imagem paga
      // só por causa de um health check. Qualquer resposta HTTP (mesmo
      // 404/405) já confirma que fal.run está de pé.
      const { up, detail } = await httpPing("https://fal.run/", signal, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
