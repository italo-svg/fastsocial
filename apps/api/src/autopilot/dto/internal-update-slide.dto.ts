import { IsUUID } from "class-validator";
import { UpdateContentSlideDto } from "../../content-pieces/dto/update-content-slide.dto";

export class InternalUpdateSlideDto extends UpdateContentSlideDto {
  @IsUUID()
  workspaceId!: string;
}
