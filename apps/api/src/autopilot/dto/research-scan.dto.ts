import { IsUUID } from "class-validator";

export class ResearchScanDto {
  @IsUUID()
  workspaceId!: string;
}
