import { IsUUID } from "class-validator";
import { GenerateCopyDto } from "../../copy-generation/dto/generate-copy.dto";

export class InternalGenerateCopyDto extends GenerateCopyDto {
  @IsUUID()
  workspaceId!: string;
}
