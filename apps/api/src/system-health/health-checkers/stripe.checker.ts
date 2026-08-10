import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";

@Injectable()
export class StripeChecker implements HealthChecker {
  readonly name = "stripe";

  constructor(private readonly config: ConfigService) {}

  check(): Promise<ServiceHealth> {
    const secretKey = this.config.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      return runWithTimeout(this.name, async () => ({ status: "not_configured" }));
    }
    return runWithTimeout(this.name, async () => {
      // balance.retrieve() é o ping padrão recomendado pela Stripe pra
      // checar conectividade/validade da chave — leitura, sem custo.
      const stripe = new Stripe(secretKey);
      try {
        await stripe.balance.retrieve();
        return { status: "up" as const };
      } catch (err) {
        // Uma StripeAuthenticationError ainda é uma resposta HTTP REAL da
        // Stripe (401), não uma falha de rede — prova que o serviço está de
        // pé, só a chave é inválida. Distinguimos pelo tipo do erro do SDK.
        if (err instanceof Stripe.errors.StripeConnectionError) {
          return { status: "down" as const, detail: err.message };
        }
        return { status: "up" as const, detail: err instanceof Error ? err.message : "Erro Stripe" };
      }
    });
  }
}
