import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, Matches, Max, Min } from "class-validator";

export class UpdateAutopilotDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  postsPerWeek?: number;

  // Soma == 1.0 é validada no service (regra de negócio entre campos, não
  // expressável de forma direta com decorators do class-validator sobre um
  // objeto de chaves dinâmicas).
  @IsOptional()
  @IsObject()
  formatMix?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsArray()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true, message: "preferredTimes deve conter horários no formato HH:mm" })
  preferredTimes?: string[];
}
