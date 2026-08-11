import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAutomationFlowDto, UpdateAutomationFlowDto } from "./dto/automation-flow.dto";

@Injectable()
export class AutomationFlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    const flows = await this.prisma.automationFlow.findMany({
      where: { workspaceId },
      include: { triggers: true, steps: { orderBy: { stepOrder: "asc" } }, runs: true },
      orderBy: { createdAt: "desc" },
    });
    return flows.map((flow) => this.toSummary(flow));
  }

  async getDetail(workspaceId: string, id: string) {
    const flow = await this.prisma.automationFlow.findFirst({
      where: { id, workspaceId },
      include: { triggers: true, steps: { orderBy: { stepOrder: "asc" } }, runs: { orderBy: { executedAt: "desc" } } },
    });
    if (!flow) throw new NotFoundException("Automação não encontrada.");
    return this.toSummary(flow, true);
  }

  // CA-02: valida que a conta social escolhida pro gatilho é uma conta de
  // Instagram REAL deste workspace (nunca confia num ID vindo do client sem checar).
  private async assertSocialAccountBelongsToWorkspace(workspaceId: string, socialAccountId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: socialAccountId, workspaceId, network: "instagram" },
    });
    if (!account) {
      throw new BadRequestException("Conta do Instagram não encontrada neste workspace.");
    }
  }

  async create(workspaceId: string, dto: CreateAutomationFlowDto) {
    await this.assertSocialAccountBelongsToWorkspace(workspaceId, dto.trigger.socialAccountId);

    const flow = await this.prisma.$transaction(async (tx) => {
      const created = await tx.automationFlow.create({ data: { workspaceId, name: dto.name, isActive: true } });
      await tx.automationTrigger.create({
        data: {
          automationFlowId: created.id,
          triggerType: dto.trigger.triggerType,
          matchValue: dto.trigger.matchValue,
          socialAccountId: dto.trigger.socialAccountId,
        },
      });
      for (const [index, step] of dto.steps.entries()) {
        await tx.automationFlowStep.create({
          data: { automationFlowId: created.id, stepOrder: index + 1, stepType: step.stepType, payload: step.payload as object },
        });
      }
      return created;
    });

    return this.getDetail(workspaceId, flow.id);
  }

  // item 1 do spec: editor é uma lista simples, não canvas — editar
  // substitui gatilho/passos por inteiro em vez de fazer diff granular
  // (mais simples, e automation_runs não referencia steps individuais, só
  // o flow, então não perde histórico ao substituir).
  async update(workspaceId: string, id: string, dto: UpdateAutomationFlowDto) {
    const flow = await this.prisma.automationFlow.findFirst({ where: { id, workspaceId } });
    if (!flow) throw new NotFoundException("Automação não encontrada.");

    if (dto.trigger) {
      await this.assertSocialAccountBelongsToWorkspace(workspaceId, dto.trigger.socialAccountId);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined || dto.isActive !== undefined) {
        await tx.automationFlow.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        });
      }
      if (dto.trigger) {
        await tx.automationTrigger.deleteMany({ where: { automationFlowId: id } });
        await tx.automationTrigger.create({
          data: {
            automationFlowId: id,
            triggerType: dto.trigger.triggerType,
            matchValue: dto.trigger.matchValue,
            socialAccountId: dto.trigger.socialAccountId,
          },
        });
      }
      if (dto.steps) {
        await tx.automationFlowStep.deleteMany({ where: { automationFlowId: id } });
        for (const [index, step] of dto.steps.entries()) {
          await tx.automationFlowStep.create({
            data: { automationFlowId: id, stepOrder: index + 1, stepType: step.stepType, payload: step.payload as object },
          });
        }
      }
    });

    return this.getDetail(workspaceId, id);
  }

  private toSummary(
    flow: {
      id: string;
      name: string;
      isActive: boolean;
      createdAt: Date;
      triggers: { triggerType: string; matchValue: string; socialAccountId: string }[];
      steps: { id: string; stepOrder: number; stepType: string; payload: unknown }[];
      runs: { status: string; executedAt: Date; errorMessage: string | null }[];
    },
    includeRecentRuns = false,
  ) {
    // CA-03: estatísticas derivadas direto de automation_runs — total,
    // sucesso/falha, taxa e os últimos 10 disparos.
    const total = flow.runs.length;
    const completed = flow.runs.filter((r) => r.status === "completed").length;
    const failed = flow.runs.filter((r) => r.status === "failed").length;
    const successRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : null;

    return {
      id: flow.id,
      name: flow.name,
      isActive: flow.isActive,
      createdAt: flow.createdAt,
      trigger: flow.triggers[0] ?? null,
      steps: flow.steps,
      stats: {
        total,
        completed,
        failed,
        successRate,
        ...(includeRecentRuns
          ? { recentRuns: flow.runs.slice(0, 10).map((r) => ({ status: r.status, executedAt: r.executedAt, errorMessage: r.errorMessage })) }
          : {}),
      },
    };
  }
}
