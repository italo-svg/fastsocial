import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PublicationsController } from "./publications.controller";
import { MetricsInternalController } from "./metrics-internal.controller";
import { ScheduleInternalController } from "./schedule-internal.controller";
import { PublicationsService } from "./publications.service";
import { PublishProcessor } from "./publish.processor";
import { InstagramFacebookPublisher } from "./network-publishers/instagram-facebook.publisher";
import { LinkedInPublisher } from "./network-publishers/linkedin.publisher";
import { SocialAccountsModule } from "../social-accounts/social-accounts.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [BullModule.registerQueue({ name: "publish" }), SocialAccountsModule, AuthModule],
  controllers: [PublicationsController, MetricsInternalController, ScheduleInternalController],
  providers: [PublicationsService, PublishProcessor, InstagramFacebookPublisher, LinkedInPublisher],
})
export class PublicationsModule {}
