import { Injectable } from "@nestjs/common";
import { DatabaseChecker } from "./health-checkers/database.checker";
import { RedisChecker } from "./health-checkers/redis.checker";
import { PostizChecker } from "./health-checkers/postiz.checker";
import { N8nChecker } from "./health-checkers/n8n.checker";
import { GlitchtipChecker } from "./health-checkers/glitchtip.checker";
import { AnthropicChecker } from "./health-checkers/anthropic.checker";
import { FalChecker } from "./health-checkers/fal.checker";
import { MetaChecker } from "./health-checkers/meta.checker";
import { LinkedinChecker } from "./health-checkers/linkedin.checker";
import { StripeChecker } from "./health-checkers/stripe.checker";
import { HealthChecker, ServiceHealth } from "./health-checkers/checker.types";

@Injectable()
export class SystemHealthService {
  private readonly checkers: HealthChecker[];

  constructor(
    database: DatabaseChecker,
    redis: RedisChecker,
    postiz: PostizChecker,
    n8n: N8nChecker,
    glitchtip: GlitchtipChecker,
    anthropic: AnthropicChecker,
    fal: FalChecker,
    meta: MetaChecker,
    linkedin: LinkedinChecker,
    stripe: StripeChecker,
  ) {
    this.checkers = [database, redis, postiz, n8n, glitchtip, anthropic, fal, meta, linkedin, stripe];
  }

  // Promise.allSettled: um checker travado/rejeitado nunca derruba os
  // outros nem o endpoint inteiro (cada checker já tem seu próprio timeout
  // de 3s via runWithTimeout, então settled aqui é só uma segunda camada de
  // segurança contra um bug inesperado dentro de um checker).
  async checkAll(): Promise<ServiceHealth[]> {
    const results = await Promise.allSettled(this.checkers.map((checker) => checker.check()));
    return results.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const checker = this.checkers[index];
      return {
        name: checker.name,
        status: "down" as const,
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        detail: result.reason instanceof Error ? result.reason.message : "Checker falhou inesperadamente",
      };
    });
  }
}
