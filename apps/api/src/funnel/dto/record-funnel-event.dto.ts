import { Type } from "class-transformer";
import { IsIn, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

// Os 7 eventos minimos do spec 046 — restringir a esta lista evita que a rota
// publica (sem auth) vire um jeito de gravar linhas arbitrarias na tabela.
export const FUNNEL_EVENT_NAMES = [
  "landing_viewed",
  "signup_started",
  "signup_completed",
  "email_confirmed",
  "onboarding_completed",
  "first_content_piece_created",
  "trial_converted_to_paid",
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

class UtmDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class RecordFunnelEventDto {
  @IsString()
  anonymousId!: string;

  @IsIn(FUNNEL_EVENT_NAMES)
  eventName!: FunnelEventName;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtmDto)
  utm?: UtmDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
