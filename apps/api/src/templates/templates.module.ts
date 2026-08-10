import { Module } from "@nestjs/common";
import { BrandKitModule } from "../brand-kit/brand-kit.module";
import { TemplatesController } from "./templates.controller";
import { TemplatesService } from "./templates.service";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";

@Module({
  imports: [BrandKitModule],
  controllers: [TemplatesController, ImportController],
  providers: [TemplatesService, ImportService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
