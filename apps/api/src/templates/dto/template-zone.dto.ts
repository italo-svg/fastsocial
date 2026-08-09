import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class TemplateZoneDto {
  @IsString()
  id!: string;

  @IsIn(["text", "image", "logo"])
  type!: "text" | "image" | "logo";

  @IsOptional()
  @IsInt()
  @Min(0)
  slideIndex?: number;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  maxLength?: number;
}

export class SlotMapDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateZoneDto)
  zones!: TemplateZoneDto[];

  // Preservado nas edicoes feitas pelo editor visual (spec 014) - sem isso o
  // whitelist:true global descartaria as imagens de fundo importadas (spec 013)
  // a cada PUT /templates/:id, pois a classe nao declarava o campo.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backgroundImages?: string[];
}
