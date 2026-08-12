import { Body, Controller, Headers, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FunnelService } from "./funnel.service";
import { RecordFunnelEventDto } from "./dto/record-funnel-event.dto";

// CA-03: rota deliberadamente PUBLICA (sem JwtAuthGuard) — boa parte do
// funil acontece antes do login. CA-05: sobrescreve o throttler "default"
// global (app.module.ts, 120/min) com um limite mais agressivo (20/min) só
// pra esta rota pública — o ThrottlerGuard já é global (APP_GUARD), não
// precisa de @UseGuards aqui.
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller("funnel")
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Post("events")
  recordEvent(@Body() dto: RecordFunnelEventDto, @Headers("authorization") authHeader?: string) {
    const auth = this.funnelService.extractOptionalAuth(authHeader);
    return this.funnelService.recordEvent(dto, auth);
  }
}
