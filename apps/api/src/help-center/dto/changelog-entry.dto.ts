import { IsISO8601, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";

export class CreateChangelogEntryDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  bodyMarkdown!: string;

  @IsString()
  tag!: string;

  // Ausente/omitido = rascunho (published_at NULL); presente = publica já com essa data.
  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}

export class UpdateChangelogEntryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  // string ISO pra publicar/republicar, null explícito pra despublicar
  // (ValidateIf pula a checagem de formato só quando o valor é null).
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  publishedAt?: string | null;
}
