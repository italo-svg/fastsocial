import { IsIn } from "class-validator";

export class RenderContentPieceDto {
  @IsIn(["instagram", "facebook", "linkedin"])
  targetNetwork!: "instagram" | "facebook" | "linkedin";
}
