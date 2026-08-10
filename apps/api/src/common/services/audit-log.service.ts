import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface RecordAuditLogParams {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

// Auditoria explícita e intencional por chamada (spec 042) — decisão
// consciente de NÃO ser um interceptor global automático por rota, para
// evitar logs ruidosos sem contexto útil de negócio. Cada módulo sensível
// chama record() no ponto exato da ação (conectar/desconectar conta,
// aprovar/rejeitar conteúdo, mudar config do autopilot, suspender/reativar/
// impersonar workspace, mudar plano).
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId ?? undefined,
        userId: params.userId ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
