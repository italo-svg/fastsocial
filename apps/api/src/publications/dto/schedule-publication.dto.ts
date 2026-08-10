import { IsDateString, IsUUID } from "class-validator";

export class SchedulePublicationDto {
  @IsUUID()
  socialAccountId!: string;

  @IsDateString()
  scheduledAt!: string;
}
