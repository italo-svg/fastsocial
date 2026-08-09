import { IsIn } from "class-validator";

export class ConnectAccountDto {
  @IsIn(["facebook", "instagram"])
  provider!: "facebook" | "instagram";
}
