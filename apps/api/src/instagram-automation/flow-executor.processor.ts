import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { TokenEncryptionService } from "../common/services/token-encryption.service";
import { SendDmHandler } from "./step-handlers/send-dm.handler";
import { SendQuickRepliesHandler } from "./step-handlers/send-quick-replies.handler";
import { WaitHandler } from "./step-handlers/wait.handler";
import { TagContactHandler } from "./step-handlers/tag-contact.handler";
import type { AutomationExecutionJobData } from "./instagram-webhook.service";

// CA-04: concurrency baixa (quantos steps tocam a API de mensageria ao
// mesmo tempo) + limiter do Worker (máximo de 5 jobs processados por
// segundo) — as duas camadas evitam estourar o rate limit da conta
// conectada. `limiter` é opção do Worker do BullMQ (não do registerQueue),
// por isso fica aqui e não em instagram-automation.module.ts.
@Processor("automation-execution", { concurrency: 3, limiter: { max: 5, duration: 1000 } })
export class FlowExecutorProcessor extends WorkerHost {
  private readonly logger = new Logger(FlowExecutorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("automation-execution") private readonly queue: Queue<AutomationExecutionJobData>,
    private readonly tokenEncryption: TokenEncryptionService,
    private readonly sendDmHandler: SendDmHandler,
    private readonly sendQuickRepliesHandler: SendQuickRepliesHandler,
    private readonly waitHandler: WaitHandler,
    private readonly tagContactHandler: TagContactHandler,
  ) {
    super();
  }

  // CA-03: cada job só sabe do PRÓPRIO runId/contactId — dois contatos
  // disparando o mesmo flow viram dois runs/jobs completamente
  // independentes, o BullMQ já processa em paralelo até o limite de
  // concurrency, nenhum job referencia estado de outro.
  async process(job: Job<AutomationExecutionJobData>): Promise<void> {
    const { runId, automationFlowId, socialAccountId, contactId, stepOrder } = job.data;

    const step = await this.prisma.automationFlowStep.findUnique({
      where: { automationFlowId_stepOrder: { automationFlowId, stepOrder } },
    });

    if (!step) {
      // Sem mais passos na ordem — o flow completou com sucesso.
      await this.prisma.automationRun.update({ where: { id: runId }, data: { status: "completed" } });
      return;
    }

    const socialAccount = await this.prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
    if (!socialAccount) {
      await this.markFailed(runId, "Conta social não encontrada — pode ter sido desconectada.");
      return;
    }

    try {
      let delayMs: number | undefined;

      switch (step.stepType) {
        case "wait":
          // CA-01: não bloqueia — o próprio job termina normalmente, o
          // PRÓXIMO step é que nasce com o delay do BullMQ aplicado abaixo.
          delayMs = this.waitHandler.execute(step.payload as { seconds?: number }).delayMs;
          break;
        case "tag_contact":
          // Achado ao validar ao vivo: tag_contact não chama a API de
          // mensageria (item 2 do spec: "sem efeito externo"), então NUNCA
          // deveria depender de decriptar o token — decriptar incondicional
          // fazia esse step falhar até numa conta sem token válido, o que
          // contradiz o próprio propósito do step. Só passa contactId/workspaceId.
          await this.tagContactHandler.execute(
            step.payload as { tag?: string },
            { accessToken: "", contactId },
            socialAccount.workspaceId,
          );
          break;
        case "send_dm":
        case "send_quick_replies": {
          const accessToken = this.tokenEncryption.decrypt(socialAccount.accessTokenEncrypted);
          const context = { accessToken, contactId };
          if (step.stepType === "send_dm") {
            await this.sendDmHandler.execute(step.payload as { text?: string }, context);
          } else {
            await this.sendQuickRepliesHandler.execute(step.payload as { text?: string; options?: string[] }, context);
          }
          break;
        }
        default:
          throw new Error(`Tipo de step desconhecido: "${step.stepType}".`);
      }

      await this.queue.add(
        "execute-step",
        { runId, automationFlowId, socialAccountId, contactId, stepOrder: stepOrder + 1 },
        delayMs ? { delay: delayMs } : undefined,
      );
    } catch (error) {
      // CA-02: falha num passo interrompe SÓ este run — nunca relança, então
      // o worker BullMQ segue processando os outros jobs normalmente.
      const message = error instanceof Error ? error.message : "Erro desconhecido ao executar o step.";
      this.logger.warn(`Automation run ${runId} falhou no step ${stepOrder} (${step.stepType}): ${message}`);
      await this.markFailed(runId, message);
    }
  }

  private async markFailed(runId: string, message: string): Promise<void> {
    await this.prisma.automationRun.update({ where: { id: runId }, data: { status: "failed", errorMessage: message } });
  }
}
