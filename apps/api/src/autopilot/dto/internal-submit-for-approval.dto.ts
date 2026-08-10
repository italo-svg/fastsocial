import { IsUUID } from "class-validator";
import { SubmitForApprovalDto } from "../../content-pieces/dto/submit-for-approval.dto";

export class InternalSubmitForApprovalDto extends SubmitForApprovalDto {
  @IsUUID()
  workspaceId!: string;
}
