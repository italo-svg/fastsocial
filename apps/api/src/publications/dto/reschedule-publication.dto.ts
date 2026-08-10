import { IsDateString } from "class-validator";

export class ReschedulePublicationDto {
  @IsDateString()
  scheduledAt!: string;
}
