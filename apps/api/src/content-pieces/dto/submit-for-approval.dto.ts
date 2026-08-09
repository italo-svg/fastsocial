import { IsBoolean, IsOptional } from "class-validator";

export class SubmitForApprovalDto {
  // Vem do autopilot_pipelines.requires_approval quando origin='autopilot' (Fase 7).
  // Default false: fluxo manual sempre passa por aprovacao a menos que explicitamente
  // marcado como auto-aprovavel — e mesmo assim, a regra de seguranca do PRD 7.7
  // (ver state-machine.ts) ignora esta flag quando ha' slide com imagem de IA.
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;
}
