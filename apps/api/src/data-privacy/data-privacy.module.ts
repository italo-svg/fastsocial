import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DataPrivacyController } from "./data-privacy.controller";
import { DataExportService } from "./data-export.service";
import { DataExportProcessor } from "./data-export.processor";
import { DataDeletionService } from "./data-deletion.service";
import { StorageService } from "../common/services/storage.service";
import { EmailService } from "../common/services/email.service";
import { AuditLogService } from "../common/services/audit-log.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [BullModule.registerQueue({ name: "data-export" }), AuthModule],
  controllers: [DataPrivacyController],
  providers: [DataExportService, DataExportProcessor, DataDeletionService, StorageService, EmailService, AuditLogService],
})
export class DataPrivacyModule {}
