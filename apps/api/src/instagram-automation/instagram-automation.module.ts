import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { WebhookController } from "./webhook.controller";
import { WebhookSignatureGuard } from "./webhook-signature.guard";
import { InstagramWebhookService } from "./instagram-webhook.service";
import { TriggerMatcherService } from "./trigger-matcher.service";
import { FlowExecutorProcessor } from "./flow-executor.processor";
import { InstagramMessagingClient } from "./instagram-messaging.client";
import { TokenEncryptionService } from "../common/services/token-encryption.service";
import { AuditLogService } from "../common/services/audit-log.service";
import { SendDmHandler } from "./step-handlers/send-dm.handler";
import { SendQuickRepliesHandler } from "./step-handlers/send-quick-replies.handler";
import { WaitHandler } from "./step-handlers/wait.handler";
import { TagContactHandler } from "./step-handlers/tag-contact.handler";
import { AutomationFlowsController } from "./automation-flows.controller";
import { AutomationFlowsService } from "./automation-flows.service";
import { AddonGuard } from "../common/guards/addon.guard";

@Module({
  imports: [
    BullModule.registerQueue({ name: "automation-execution" }),
  ],
  controllers: [WebhookController, AutomationFlowsController],
  providers: [
    WebhookSignatureGuard,
    InstagramWebhookService,
    TriggerMatcherService,
    FlowExecutorProcessor,
    InstagramMessagingClient,
    TokenEncryptionService,
    AuditLogService,
    SendDmHandler,
    SendQuickRepliesHandler,
    WaitHandler,
    TagContactHandler,
    AutomationFlowsService,
    AddonGuard,
  ],
  exports: [TriggerMatcherService],
})
export class InstagramAutomationModule {}
