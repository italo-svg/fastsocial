import { IsString } from "class-validator";

export class UpdateContentPieceDto {
  @IsString()
  templateId!: string;
}
