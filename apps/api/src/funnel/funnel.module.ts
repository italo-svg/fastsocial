import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { FunnelController } from "./funnel.controller";
import { FunnelService } from "./funnel.service";
import { FunnelAnalyticsController } from "./funnel-analytics.controller";
import { FunnelAnalyticsService } from "./funnel-analytics.service";

// CA-05 (spec 046): limite agressivo (20 req/min por IP) — a rota de
// captura é pública e usada antes do login, então precisa ser resistente a
// abuso trivial sem exigir nenhuma credencial. As rotas de analytics (spec
// 047) são protegidas por PlatformAdminGuard, não passam pelo Throttler.
@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 20 }])],
  controllers: [FunnelController, FunnelAnalyticsController],
  providers: [FunnelService, FunnelAnalyticsService],
})
export class FunnelModule {}
