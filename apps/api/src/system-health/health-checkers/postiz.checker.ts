import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

const DEFAULT_POSTIZ_API_URL = "http://volupia_postiz:3000";

@Injectable()
export class PostizChecker implements HealthChecker {
  readonly name = "postiz";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const apiUrl = this.config.get<string>("POSTIZ_API_URL") ?? DEFAULT_POSTIZ_API_URL;
    return runWithTimeout(this.name, async (signal) => {
      // Sem apiKey de workspace (checker global, não por tenant) — 401 aqui
      // é uma resposta HTTP real, prova que o serviço está de pé.
      const { up, detail } = await httpPing(`${apiUrl}/public/v1/integrations`, signal);
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
