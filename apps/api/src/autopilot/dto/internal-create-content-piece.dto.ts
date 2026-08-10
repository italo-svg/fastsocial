import { IsUUID } from "class-validator";
import { CreateContentPieceDto } from "../../content-pieces/dto/create-content-piece.dto";

export class InternalCreateContentPieceDto extends CreateContentPieceDto {
  @IsUUID()
  workspaceId!: string;
}
