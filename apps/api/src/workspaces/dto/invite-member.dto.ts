import { IsEmail, IsIn } from "class-validator";

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(["workspace_admin", "editor", "viewer"])
  role!: string;
}
