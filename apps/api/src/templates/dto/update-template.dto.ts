import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { SlotMapDto } from "./template-zone.dto";

export class UpdateTemplateDto {
  @IsOptional()
  @IsIn(["static_post", "carousel"])
  format?: string;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SlotMapDto)
  slotMap?: SlotMapDto;
}
