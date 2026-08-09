import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateCopyDto {
  @IsOptional()
  @IsString()
  insightId?: string;

  @IsOptional()
  @IsString()
  briefing?: string;

  @IsIn(["static_post", "carousel", "reels_script"])
  format!: "static_post" | "carousel" | "reels_script";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  slideCount?: number;

  @IsOptional()
  @IsString()
  variationHint?: string;
}
