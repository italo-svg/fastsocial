import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { TriggerMatcherService } from "./trigger-matcher.service";
import type { InstagramWebhookPayload, NormalizedInstagramEvent } from "./dto/instagram-webhook-payload.dto";

export interface AutomationExecutionJobData {
  automationFlowId: string;
  triggerId: string;
  workspaceId: string;
  event: NormalizedInstagramEvent;
}

@Injectable()
export class InstagramWebhookService {
  private readonly logger = new Logger(InstagramWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly triggerMatcher: TriggerMatcherService,
    @InjectQueue("automation-execution") private readonly automationQueue: Queue<AutomationExecutionJobData>,
  ) {}

  // item 2 do spec: extrai o(s) evento(s) do payload real da Meta —
  // comentário (via "changes", field="comments") e DM/resposta de story (via
  // "messaging"). Distinguir story_reply de message comum depende de um
  // campo que varia entre versões da API da Meta — aproximação de boa fé,
  // tratado como "message" quando não dá pra confirmar com certeza.
  parseEvents(payload: InstagramWebhookPayload): { externalAccountId: string; event: NormalizedInstagramEvent }[] {
    const results: { externalAccountId: string; event: NormalizedInstagramEvent }[] = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === "comments" && change.value.text) {
          results.push({
            externalAccountId: entry.id,
            event: { externalAccountId: entry.id, triggerType: "comment", text: change.value.text },
          });
        }
      }

      for (const message of entry.messaging ?? []) {
        if (message.message?.text && !message.message.is_echo) {
          results.push({
            externalAccountId: entry.id,
            event: { externalAccountId: entry.id, triggerType: "message", text: message.message.text },
          });
        }
      }
    }

    return results;
  }

  // item 3/4/5 do spec: checa o add-on ANTES de qualquer matching (economiza
  // trabalho pra quem não contratou), enfileira em vez de executar síncrono
  // (webhook da Meta tem timeout curto), responde rápido.
  async processPayload(payload: InstagramWebhookPayload): Promise<{ enqueued: number }> {
    const events = this.parseEvents(payload);
    let enqueued = 0;

    for (const { externalAccountId, event } of events) {
      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: { network: "instagram", externalAccountId },
      });
      if (!socialAccount) {
        this.logger.warn(`Webhook do Instagram sem social_account correspondente (external_account_id=${externalAccountId}).`);
        continue;
      }

      const addon = await this.prisma.workspaceAddon.findUnique({
        where: { workspaceId_addonKey: { workspaceId: socialAccount.workspaceId, addonKey: "instagram_automation" } },
      });
      if (addon?.status !== "active") {
        continue; // CA-04: ignora silenciosamente, sem erro.
      }

      const matches = await this.triggerMatcher.findMatchingFlows(socialAccount.id, event.triggerType, event.text);
      for (const match of matches) {
        await this.automationQueue.add("execute", {
          automationFlowId: match.automationFlowId,
          triggerId: match.triggerId,
          workspaceId: socialAccount.workspaceId,
          event,
        });
        enqueued += 1;
      }
    }

    return { enqueued };
  }
}
