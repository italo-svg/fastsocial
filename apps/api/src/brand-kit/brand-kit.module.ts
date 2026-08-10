import { Module } from "@nestjs/common";
import { BrandKitController } from "./brand-kit.controller";
import { BrandKitService } from "./brand-kit.service";
import { StorageService } from "../common/services/storage.service";
import { AuditLogService } from "../common/services/audit-log.service";

@Module({
  controllers: [BrandKitController],
  providers: [BrandKitService, StorageService, AuditLogService],
  exports: [StorageService],
})
export class BrandKitModule {}
