import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { FunnelService } from "./funnel.service";
import { RecordFunnelEventDto } from "./dto/record-funnel-event.dto";

// CA-03: rota deliberadamente PUBLICA (sem JwtAuthGuard) — boa parte do
// funil acontece antes do login. CA-05: ThrottlerGuard + a config de
// ThrottlerModule importada só em FunnelModule (não em app.module.ts) —
// escopo restrito a esta rota pública, não afeta o resto da API.
@UseGuards(ThrottlerGuard)
@Controller("funnel")
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Post("events")
  recordEvent(@Body() dto: RecordFunnelEventDto, @Headers("authorization") authHeader?: string) {
    const auth = this.funnelService.extractOptionalAuth(authHeader);
    return this.funnelService.recordEvent(dto, auth);
  }
}
