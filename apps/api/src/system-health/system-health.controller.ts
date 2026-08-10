import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { SystemHealthService } from "./system-health.service";

// CA-04: mesma dupla de guards do resto do módulo platform-admin (spec 041)
// — exige isPlatformSuperAdmin=true, não só workspace_admin.
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller("platform")
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  @Get("system-health")
  async check() {
    return { services: await this.systemHealthService.checkAll() };
  }
}
