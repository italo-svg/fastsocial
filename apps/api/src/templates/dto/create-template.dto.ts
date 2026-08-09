import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { SlotMapDto } from "./template-zone.dto";

export class CreateTemplateDto {
  @IsIn(["static_post", "carousel"])
  format!: string;

  @IsOptional()
  @IsIn(["upload", "canva_import", "gamma_import"])
  source?: string;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ValidateNested()
  @Type(() => SlotMapDto)
  slotMap!: SlotMapDto;
}
