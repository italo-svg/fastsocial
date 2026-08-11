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

@Module({
  imports: [
    // CA-04: limiter da fila (nível de conta/global do worker, camada extra
    // além da concurrency do Processor) — máximo de 5 jobs processados por
    // segundo, folga confortável abaixo dos limites reais da Meta Messaging
    // Platform pra uma única conta conectada.
    BullModule.registerQueue({ name: "automation-execution", limiter: { max: 5, duration: 1000 } }),
  ],
  controllers: [WebhookController],
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
  ],
  exports: [TriggerMatcherService],
})
export class InstagramAutomationModule {}
