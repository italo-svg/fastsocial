import { Module } from "@nestjs/common";
import { AddonsController } from "./addons.controller";
import { AddonsService } from "./addons.service";
import { BillingModule } from "../billing/billing.module";
import { AuditLogService } from "../common/services/audit-log.service";

@Module({
  imports: [BillingModule],
  controllers: [AddonsController],
  providers: [AddonsService, AuditLogService],
})
export class AddonsModule {}
