import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { FunnelAnalyticsService } from "./funnel-analytics.service";
import { FunnelByUtmQueryDto, FunnelDateRangeDto } from "./dto/funnel-query.dto";

// CA-04: mesmo par de guards do resto do módulo platform-admin (specs 041/045).
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller("platform")
export class FunnelAnalyticsController {
  constructor(private readonly funnelAnalyticsService: FunnelAnalyticsService) {}

  @Get("funnel")
  getFunnel(@Query() query: FunnelDateRangeDto) {
    return this.funnelAnalyticsService.getFunnel(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get("funnel/by-utm")
  getByUtm(@Query() query: FunnelByUtmQueryDto) {
    return this.funnelAnalyticsService.getByUtm(query.groupBy);
  }
}
