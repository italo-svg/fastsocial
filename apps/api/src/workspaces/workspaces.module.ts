import { Module } from "@nestjs/common";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";
import { EmailService } from "../common/services/email.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule], // reusa SupabaseAdminService exportado pelo AuthModule
  controllers: [WorkspacesController],
  providers: [WorkspacesService, EmailService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
