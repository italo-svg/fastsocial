import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/services/audit-log.service";
import { UpdateAutopilotDto } from "./dto/update-autopilot.dto";

const MAX_POSTS_PER_WEEK_WITHOUT_WARNING = 14;
const FORMAT_MIX_SUM_TOLERANCE = 0.001;

export interface AutopilotResponse {
  workspaceId: string;
  isActive: boolean;
  postsPerWeek: number;
  formatMix: Record<string, number>;
  requiresApproval: boolean;
  preferredTimes: string[];
  lastRunAt: Date | null;
  warnings: string[];
}

@Injectable()
export class AutopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get(workspaceId: string): Promise<AutopilotResponse | null> {
    const pipeline = await this.prisma.autopilotPipeline.findUnique({ where: { workspaceId } });
    if (!pipeline) return null;
    return this.toResponse(pipeline);
  }

  // CA-01: formatMix precisa somar 1.0 — recusado antes de qualquer escrita.
  async upsert(workspaceId: string, dto: UpdateAutopilotDto, userId?: string): Promise<AutopilotResponse> {
    if (dto.formatMix !== undefined) {
      const sum = Object.values(dto.formatMix).reduce((acc, v) => acc + v, 0);
      if (Math.abs(sum - 1) > FORMAT_MIX_SUM_TOLERANCE) {
        throw new BadRequestException(`formatMix deve somar 1.0 (soma atual: ${sum}).`);
      }
    }

    const pipeline = await this.prisma.autopilotPipeline.upsert({
      where: { workspaceId },
      update: {
        ...(dto.postsPerWeek !== undefined ? { postsPerWeek: dto.postsPerWeek } : {}),
        ...(dto.formatMix !== undefined ? { formatMix: dto.formatMix as Prisma.InputJsonValue } : {}),
        ...(dto.requiresApproval !== undefined ? { requiresApproval: dto.requiresApproval } : {}),
        ...(dto.preferredTimes !== undefined ? { preferredTimes: dto.preferredTimes as Prisma.InputJsonValue } : {}),
      },
      create: {
        workspaceId,
        postsPerWeek: dto.postsPerWeek ?? 3,
        formatMix: (dto.formatMix ?? { static_post: 0.5, carousel: 0.5 }) as Prisma.InputJsonValue,
        requiresApproval: dto.requiresApproval ?? true,
        preferredTimes: (dto.preferredTimes ?? ["09:00", "18:00"]) as Prisma.InputJsonValue,
      },
    });

    const response = this.toResponse(pipeline);
    const finalPostsPerWeek = dto.postsPerWeek ?? pipeline.postsPerWeek;
    if (finalPostsPerWeek > MAX_POSTS_PER_WEEK_WITHOUT_WARNING) {
      response.warnings.push(
        `${finalPostsPerWeek} posts/semana é um volume alto — atenção ao custo de API de IA (Anthropic/fal.ai) gerado por esse ritmo.`,
      );
    }

    // CA-01 (spec 042): mudança de config do piloto automático auditada.
    await this.auditLog.record({
      workspaceId,
      userId,
      action: "autopilot_config_updated",
      entityType: "autopilot_pipeline",
      entityId: pipeline.id,
      metadata: { fields: Object.keys(dto) },
    });

    return response;
  }

  // CA-02: ativar exige brand_kit.niche preenchido e ao menos 1 social_account
  // conectada — evita ligar um piloto automático que não vai conseguir
  // publicar nada (nem sequer teria um nicho para pesquisar/gerar copy).
  async toggle(workspaceId: string, isActive: boolean, userId?: string): Promise<AutopilotResponse> {
    if (isActive) {
      const missing: string[] = [];

      const brandKit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
      if (!brandKit?.niche) missing.push("Brand Kit sem nicho definido");

      const connectedAccount = await this.prisma.socialAccount.findFirst({
        where: { workspaceId, status: "connected" },
      });
      if (!connectedAccount) missing.push("Nenhuma conta social conectada");

      if (missing.length > 0) {
        throw new BadRequestException(
          `Não é possível ativar o piloto automático: ${missing.join("; ")}.`,
        );
      }
    }

    const pipeline = await this.prisma.autopilotPipeline.upsert({
      where: { workspaceId },
      update: { isActive },
      create: { workspaceId, isActive },
    });

    // CA-01 (spec 042): mudança de config do piloto automático auditada.
    await this.auditLog.record({
      workspaceId,
      userId,
      action: isActive ? "autopilot_activated" : "autopilot_deactivated",
      entityType: "autopilot_pipeline",
      entityId: pipeline.id,
    });

    return this.toResponse(pipeline);
  }

  // CA-05: histórico simples derivado de content_pieces (origin='autopilot'),
  // sem tabela de log de execuções dedicada — reusa dado que já existe
  // (mesmo racional de simplicidade documentado no spec 036).
  async runs(workspaceId: string) {
    const pieces = await this.prisma.contentPiece.findMany({
      where: { workspaceId, origin: "autopilot" },
      select: { id: true, format: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const byDay = new Map<string, { date: string; count: number; pieces: typeof pieces }>();
    for (const piece of pieces) {
      const day = piece.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { date: day, count: 0, pieces: [] };
      entry.count += 1;
      entry.pieces.push(piece);
      byDay.set(day, entry);
    }
    return Array.from(byDay.values());
  }

  private toResponse(pipeline: {
    workspaceId: string;
    isActive: boolean;
    postsPerWeek: number;
    formatMix: unknown;
    requiresApproval: boolean;
    preferredTimes: unknown;
    lastRunAt: Date | null;
  }): AutopilotResponse {
    return {
      workspaceId: pipeline.workspaceId,
      isActive: pipeline.isActive,
      postsPerWeek: pipeline.postsPerWeek,
      formatMix: pipeline.formatMix as Record<string, number>,
      requiresApproval: pipeline.requiresApproval,
      preferredTimes: pipeline.preferredTimes as string[],
      lastRunAt: pipeline.lastRunAt,
      warnings: [],
    };
  }
}
