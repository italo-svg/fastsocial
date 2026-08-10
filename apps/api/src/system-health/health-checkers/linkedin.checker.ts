import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";
import { httpPing } from "./http-ping.util";

@Injectable()
export class LinkedinChecker implements HealthChecker {
  readonly name = "linkedin";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const clientId = this.config.get<string>("LINKEDIN_CLIENT_ID");
    const clientSecret = this.config.get<string>("LINKEDIN_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return runWithTimeout(this.name, async () => ({ status: "not_configured" }));
    }
    return runWithTimeout(this.name, async (signal) => {
      // Sem um authorization_code real não dá pra emitir token (fluxo é
      // sempre por usuário, spec 029) — POST com grant inválido devolve o
      // erro genuíno do LinkedIn (400), o mesmo padrão já validado ao vivo
      // no spec 029, provando que a rede/credencial básica está viva.
      const { up, detail } = await httpPing("https://www.linkedin.com/oauth/v2/accessToken", signal, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "system-health-check-invalid",
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });
      return up ? { status: "up", detail } : { status: "down", detail };
    });
  }
}
