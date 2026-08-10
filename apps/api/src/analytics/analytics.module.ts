import { Module } from "@nestjs/common";
import { MetricsCollectorService } from "./metrics-collector.service";
import { InstagramFacebookCollector } from "./collectors/instagram-facebook.collector";
import { LinkedInCollector } from "./collectors/linkedin.collector";
import { TokenEncryptionService } from "../common/services/token-encryption.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsQueryService } from "./analytics-query.service";

@Module({
  controllers: [AnalyticsController],
  providers: [
    MetricsCollectorService,
    InstagramFacebookCollector,
    LinkedInCollector,
    TokenEncryptionService,
    AnalyticsQueryService,
  ],
  exports: [MetricsCollectorService],
})
export class AnalyticsModule {}
