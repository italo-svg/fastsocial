import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { SystemHealthController } from "./system-health.controller";
import { SystemHealthService } from "./system-health.service";
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

@Module({
  // RedisChecker precisa de uma Queue injetável (reusa a conexão real do
  // BullMQ) — registra a mesma fila "publish" que BullBoardModule já usa,
  // o BullMQ dedupe por nome de fila então isso não abre uma segunda conexão.
  imports: [BullModule.registerQueue({ name: "publish" })],
  controllers: [SystemHealthController],
  providers: [
    SystemHealthService,
    DatabaseChecker,
    RedisChecker,
    PostizChecker,
    N8nChecker,
    GlitchtipChecker,
    AnthropicChecker,
    FalChecker,
    MetaChecker,
    LinkedinChecker,
    StripeChecker,
  ],
})
export class SystemHealthModule {}
