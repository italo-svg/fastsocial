import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

const DEFAULT_N8N_API_URL = "http://volupia_n8n:5678";

@Injectable()
export class N8nChecker implements HealthChecker {
  readonly name = "n8n";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const apiUrl = this.config.get<string>("N8N_API_URL") ?? DEFAULT_N8N_API_URL;
    return runWithTimeout(this.name, async (signal) => {
      const { up, detail } = await httpPing(`${apiUrl}/healthz`, signal);
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
