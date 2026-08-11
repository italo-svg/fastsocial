import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";

const STEP_TYPES = ["send_dm", "send_quick_replies", "wait", "tag_contact"] as const;
const TRIGGER_TYPES = ["comment", "message", "story_reply"] as const;

class TriggerDto {
  @IsIn(TRIGGER_TYPES)
  triggerType!: (typeof TRIGGER_TYPES)[number];

  @IsString()
  @MinLength(1)
  matchValue!: string;

  @IsString()
  socialAccountId!: string;
}

class StepDto {
  @IsIn(STEP_TYPES)
  stepType!: (typeof STEP_TYPES)[number];

  @IsObject()
  payload!: Record<string, unknown>;
}

export class CreateAutomationFlowDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @ValidateNested()
  @Type(() => TriggerDto)
  trigger!: TriggerDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps!: StepDto[];
}

export class UpdateAutomationFlowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TriggerDto)
  trigger?: TriggerDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps?: StepDto[];
}
