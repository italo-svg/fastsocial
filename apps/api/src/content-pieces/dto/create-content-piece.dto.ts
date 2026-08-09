import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateContentPieceDto {
  @IsString()
  templateId!: string;

  @IsIn(["static_post", "carousel"])
  format!: string;

  @IsOptional()
  @IsString()
  briefing?: string;

  @IsOptional()
  @IsString()
  insightId?: string;
}
