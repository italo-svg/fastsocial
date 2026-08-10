import { IsBoolean } from "class-validator";

export class ToggleAutopilotDto {
  @IsBoolean()
  isActive!: boolean;
}
