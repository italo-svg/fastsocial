import { Module } from "@nestjs/common";
import { AutopilotInternalController } from "./autopilot-internal.controller";
import { AutopilotInternalService } from "./autopilot-internal.service";
import { AuthModule } from "../auth/auth.module";
import { ResearchModule } from "../research/research.module";

@Module({
  imports: [AuthModule, ResearchModule],
  controllers: [AutopilotInternalController],
  providers: [AutopilotInternalService],
})
export class AutopilotModule {}
