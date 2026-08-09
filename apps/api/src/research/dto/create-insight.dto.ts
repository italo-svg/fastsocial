import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateInsightDto {
  @IsString()
  summary!: string;

  @IsOptional()
  @IsString()
  sourceRef?: string;

  @IsOptional()
  @IsIn(["static_post", "carousel"])
  suggestedFormat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  relevanceScore?: number;
}
