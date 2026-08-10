import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

@Injectable()
export class AnthropicChecker implements HealthChecker {
  readonly name = "anthropic";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return runWithTimeout(this.name, async () => ({ status: "not_configured" }));
    }
    return runWithTimeout(this.name, async (signal) => {
      // GET /v1/models: chamada leve e gratuita (não consome tokens de
      // geração), suficiente pra confirmar conectividade + chave válida.
      const { up, detail } = await httpPing("https://api.anthropic.com/v1/models", signal, {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
