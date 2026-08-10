import { IsString } from "class-validator";

export class CheckoutSessionDto {
  @IsString()
  planKey!: string;
}
