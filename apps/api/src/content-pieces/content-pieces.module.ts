import { Module } from "@nestjs/common";
import { BrandKitModule } from "../brand-kit/brand-kit.module";
import { ContentPiecesController } from "./content-pieces.controller";
import { ApprovalController } from "./approval.controller";
import { ContentPiecesService } from "./content-pieces.service";
import { AuditLogService } from "../common/services/audit-log.service";

@Module({
  imports: [BrandKitModule],
  controllers: [ContentPiecesController, ApprovalController],
  providers: [ContentPiecesService, AuditLogService],
  exports: [ContentPiecesService],
})
export class ContentPiecesModule {}
