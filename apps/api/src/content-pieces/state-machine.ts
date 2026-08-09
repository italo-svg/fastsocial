export type ContentPieceStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";

const VALID_TRANSITIONS: Record<ContentPieceStatus, ContentPieceStatus[]> = {
  draft: ["pending_approval", "approved"],
  pending_approval: ["approved", "rejected"],
  approved: ["scheduled"],
  rejected: ["pending_approval", "draft"],
  scheduled: ["published", "failed"],
  published: [],
  failed: ["draft"],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ContentPieceStatus,
    public readonly to: ContentPieceStatus,
  ) {
    super(`Transição de estado inválida: "${from}" → "${to}".`);
  }
}

export function assertValidTransition(from: ContentPieceStatus, to: ContentPieceStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export const EDITABLE_STATUSES: ContentPieceStatus[] = ["draft", "rejected"];

export function isEditable(status: ContentPieceStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export interface SubmitForApprovalContext {
  hasAiGeneratedSlide: boolean;
  autoApprove: boolean;
}

// REGRA DE SEGURANCA DO PRD 7.7 — a mais critica deste spec (o proprio dono do
// produto pediu explicitamente para tentar burlar isso por todos os caminhos
// antes de considerar o spec concluido, ver Notas de Implementacao do spec 025).
// Qualquer slide com image_source='ai_generated' NUNCA pula aprovacao humana,
// mesmo que autoApprove=true venha do autopilot (workspace com
// requires_approval=false). Esta funcao pura e isolada e' o UNICO lugar do
// codigo que decide esse pulo — nao existe nenhum outro caminho/flag que
// consiga contornar essa checagem.
export function resolveSubmissionTarget(
  context: SubmitForApprovalContext,
): "pending_approval" | "approved" {
  if (context.hasAiGeneratedSlide) return "pending_approval";
  return context.autoApprove ? "approved" : "pending_approval";
}
