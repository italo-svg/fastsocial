import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateHelpArticleDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  contentMarkdown!: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateHelpArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
