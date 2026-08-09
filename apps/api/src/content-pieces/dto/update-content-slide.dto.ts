import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateContentSlideDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  slideText?: string;

  @IsOptional()
  @IsIn(["own_library", "stock_bank", "ai_generated"])
  imageSource?: string;

  @IsOptional()
  @IsString()
  backgroundImageUrl?: string;
}
