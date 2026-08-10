import { IsUUID } from "class-validator";
import { CreateImageGenerationJobDto } from "../../image-generation/dto/create-image-generation-job.dto";

export class InternalCreateImageJobDto extends CreateImageGenerationJobDto {
  @IsUUID()
  workspaceId!: string;
}
