import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TemplateZoneDto)
  zones!: TemplateZoneDto[];
}
