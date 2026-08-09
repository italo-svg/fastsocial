import { IsString, MinLength } from "class-validator";

export class RejectContentPieceDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
