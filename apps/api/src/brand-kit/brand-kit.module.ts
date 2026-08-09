import { Module } from "@nestjs/common";
import { BrandKitController } from "./brand-kit.controller";
import { BrandKitService } from "./brand-kit.service";
import { StorageService } from "../common/services/storage.service";

@Module({
  controllers: [BrandKitController],
  providers: [BrandKitService, StorageService],
  exports: [StorageService],
})
export class BrandKitModule {}
