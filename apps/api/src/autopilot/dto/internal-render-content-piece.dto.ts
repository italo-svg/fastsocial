import { IsUUID } from "class-validator";
import { RenderContentPieceDto } from "../../content-pieces/dto/render-content-piece.dto";

export class InternalRenderContentPieceDto extends RenderContentPieceDto {
  @IsUUID()
  workspaceId!: string;
}
