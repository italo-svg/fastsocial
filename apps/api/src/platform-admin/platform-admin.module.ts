import { Module } from "@nestjs/common";
import { PlatformAdminController } from "./platform-admin.controller";
import { PlatformAdminService } from "./platform-admin.service";
import { AuthModule } from "../auth/auth.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { AuditLogService } from "../common/services/audit-log.service";

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, AuditLogService],
})
export class PlatformAdminModule {}
