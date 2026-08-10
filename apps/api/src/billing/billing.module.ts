import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingService } from "./billing.service";
import { StripeWebhookHandlerService } from "./stripe-webhook-handler.service";

@Module({
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, StripeWebhookHandlerService],
})
export class BillingModule {}
