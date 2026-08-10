import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { WebhookController } from "./webhook.controller";
import { WebhookSignatureGuard } from "./webhook-signature.guard";
import { InstagramWebhookService } from "./instagram-webhook.service";
import { TriggerMatcherService } from "./trigger-matcher.service";

@Module({
  imports: [BullModule.registerQueue({ name: "automation-execution" })],
  controllers: [WebhookController],
  providers: [WebhookSignatureGuard, InstagramWebhookService, TriggerMatcherService],
  exports: [TriggerMatcherService],
})
export class InstagramAutomationModule {}
