import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "./current-user.decorator";
import { AuthService, AuthMeResponse } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: CurrentUserPayload): Promise<AuthMeResponse> {
    return this.authService.getMe(user.id);
  }
}
