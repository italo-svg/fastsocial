import { Module } from "@nestjs/common";
import { MetricsCollectorService } from "./metrics-collector.service";
import { InstagramFacebookCollector } from "./collectors/instagram-facebook.collector";
import { LinkedInCollector } from "./collectors/linkedin.collector";
import { TokenEncryptionService } from "../common/services/token-encryption.service";

@Module({
  providers: [MetricsCollectorService, InstagramFacebookCollector, LinkedInCollector, TokenEncryptionService],
  exports: [MetricsCollectorService],
})
export class AnalyticsModule {}
