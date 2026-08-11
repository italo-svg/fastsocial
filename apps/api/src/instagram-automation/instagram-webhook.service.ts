import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { TriggerMatcherService } from "./trigger-matcher.service";
import type { InstagramWebhookPayload, NormalizedInstagramEvent } from "./dto/instagram-webhook-payload.dto";

// spec 055: um job por STEP (não por flow inteiro) — o worker re-enfileira o
// próximo step ele mesmo (com delay nativo do BullMQ pro step "wait"), então
// o job só precisa saber ONDE recomeçar (runId + stepOrder), não o payload
// original do evento inteiro.
export interface AutomationExecutionJobData {
  runId: string;
  automationFlowId: string;
  socialAccountId: string;
  contactId: string;
  stepOrder: number;
}

@Injectable()
export class InstagramWebhookService {
  private readonly logger = new Logger(InstagramWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly triggerMatcher: TriggerMatcherService,
    @InjectQueue("automation-execution") private readonly automationQueue: Queue<AutomationExecutionJobData>,
  ) {}

  // item 2 do spec 054: extrai o(s) evento(s) do payload real da Meta —
  // comentário (via "changes", field="comments") e DM/resposta de story (via
  // "messaging"). Distinguir story_reply de message comum depende de um
  // campo que varia entre versões da API da Meta — aproximação de boa fé,
  // tratado como "message" quando não dá pra confirmar com certeza.
  parseEvents(payload: InstagramWebhookPayload): NormalizedInstagramEvent[] {
    const results: NormalizedInstagramEvent[] = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === "comments" && change.value.text && change.value.from?.id) {
          results.push({
            externalAccountId: entry.id,
            triggerType: "comment",
            text: change.value.text,
            contactId: change.value.from.id,
          });
        }
      }

      for (const message of entry.messaging ?? []) {
        if (message.message?.text && !message.message.is_echo && message.sender?.id) {
          results.push({
            externalAccountId: entry.id,
            triggerType: "message",
            text: message.message.text,
            contactId: message.sender.id,
          });
        }
      }
    }

    return results;
  }

  // item 3/4/5 do spec 054: checa o add-on ANTES de qualquer matching
  // (economiza trabalho pra quem não contratou), enfileira em vez de
  // executar síncrono (webhook da Meta tem timeout curto), responde rápido.
  async processPayload(payload: InstagramWebhookPayload): Promise<{ enqueued: number }> {
    const events = this.parseEvents(payload);
    let enqueued = 0;

    for (const event of events) {
      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: { network: "instagram", externalAccountId: event.externalAccountId },
      });
      if (!socialAccount) {
        this.logger.warn(`Webhook do Instagram sem social_account correspondente (external_account_id=${event.externalAccountId}).`);
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
        const run = await this.prisma.automationRun.create({
          data: { automationFlowId: match.automationFlowId, triggeredBy: event.triggerType, status: "pending" },
        });
        await this.automationQueue.add("execute-step", {
          runId: run.id,
          automationFlowId: match.automationFlowId,
          socialAccountId: socialAccount.id,
          contactId: event.contactId,
          stepOrder: 1,
        });
        enqueued += 1;
      }
    }

    return { enqueued };
  }
}
