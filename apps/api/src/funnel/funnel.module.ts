import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { FunnelController } from "./funnel.controller";
import { FunnelService } from "./funnel.service";

// CA-05: limite agressivo (20 req/min por IP) — a rota é pública e usada
// antes do login, então precisa ser resistente a abuso trivial sem exigir
// nenhuma credencial. 20/min cobre com folga uma jornada real (poucos
// eventos por visita) sem abrir espaço pra flood.
@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 20 }])],
  controllers: [FunnelController],
  providers: [FunnelService],
})
export class FunnelModule {}
