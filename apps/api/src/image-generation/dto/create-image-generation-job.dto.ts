import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateImageGenerationJobDto {
  @IsString()
  contentSlideId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNumber?: number;
}
