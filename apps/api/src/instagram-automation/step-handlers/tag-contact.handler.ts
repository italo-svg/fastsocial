import { Injectable } from "@nestjs/common";
import { AuditLogService } from "../../common/services/audit-log.service";
import type { StepExecutionContext, StepHandlerResult } from "./step-handler.types";

// item 2 do spec: "só grava metadado (sem efeito externo)" — o schema deste
// módulo (spec 053) não tem uma tabela dedicada de tags de contato, então
// reusa audit_logs (já tem entity_id/entity_type/metadata JSON prontos pra
// consulta futura por segmentação: `WHERE action='automation_tag_contact'`)
// em vez de criar uma tabela nova só pra isso — zero efeito externo real
// (nenhuma chamada à Meta), consistente com o que o spec pede.
@Injectable()
export class TagContactHandler {
  constructor(private readonly auditLog: AuditLogService) {}

  async execute(
    payload: { tag?: string },
    context: StepExecutionContext,
    workspaceId: string,
  ): Promise<StepHandlerResult> {
    if (!payload.tag) {
      throw new Error('Step "tag_contact" sem "tag" no payload.');
    }
    await this.auditLog.record({
      workspaceId,
      action: "automation_tag_contact",
      entityType: "instagram_contact",
      entityId: context.contactId,
      metadata: { tag: payload.tag },
    });
    return {};
  }
}
