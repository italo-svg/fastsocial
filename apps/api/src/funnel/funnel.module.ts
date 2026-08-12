import { Module } from "@nestjs/common";
import { FunnelController } from "./funnel.controller";
import { FunnelService } from "./funnel.service";
import { FunnelAnalyticsController } from "./funnel-analytics.controller";
import { FunnelAnalyticsService } from "./funnel-analytics.service";

// CA-05 (spec 046): limite agressivo (20 req/min por IP) — a rota de
// captura é pública e usada antes do login, então precisa ser resistente a
// abuso trivial sem exigir nenhuma credencial. As rotas de analytics (spec
// 047) são protegidas por PlatformAdminGuard, não passam pelo Throttler.
//
// Não registra o próprio ThrottlerModule.forRoot() aqui — usa o guard/config
// global do app.module.ts (default: 120/min) e sobrescreve só as rotas deste
// controller via @Throttle() (ver funnel.controller.ts). Ter dois
// forRoot() concorrentes fazia o limite de um vazar pra API inteira (achado
// real numa auditoria de prontidão de produção).
@Module({
  controllers: [FunnelController, FunnelAnalyticsController],
  providers: [FunnelService, FunnelAnalyticsService],
})
export class FunnelModule {}
