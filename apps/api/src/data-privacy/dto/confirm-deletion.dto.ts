import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ConfirmDeletionDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsBoolean()
  alsoDeleteAccount?: boolean;
}
