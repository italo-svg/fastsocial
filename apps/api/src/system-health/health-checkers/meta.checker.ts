import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

@Injectable()
export class MetaChecker implements HealthChecker {
  readonly name = "meta";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const token = this.config.get<string>("META_ADS_LIBRARY_ACCESS_TOKEN");
    if (!token) {
      return runWithTimeout(this.name, async () => ({ status: "not_configured" }));
    }
    return runWithTimeout(this.name, async (signal) => {
      // /me é o ping padrão da Graph API — mesmo um token expirado devolve
      // um JSON de erro real da Meta (prova de conectividade), não um
      // timeout de rede.
      const { up, detail } = await httpPing(
        `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`,
        signal,
      );
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
