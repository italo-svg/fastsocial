import { IsIn, IsISO8601, IsOptional } from "class-validator";

export class FunnelDateRangeDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class FunnelByUtmQueryDto {
  @IsIn(["source", "medium", "campaign"])
  groupBy!: "source" | "medium" | "campaign";
}
