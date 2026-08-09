import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateBrandKitDto {
  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsArray()
  competitors?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  toneOfVoice?: string;

  @IsOptional()
  @IsObject()
  colorPalette?: Record<string, string>;

  @IsOptional()
  @IsObject()
  typography?: Record<string, unknown>;

  @IsOptional()
  @IsIn(["own_library", "stock_bank", "ai_generated"])
  defaultImageSource?: string;
}
