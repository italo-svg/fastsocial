import { Module } from "@nestjs/common";
import { BrandKitModule } from "../brand-kit/brand-kit.module";
import { ContentPiecesController } from "./content-pieces.controller";
import { ContentPiecesService } from "./content-pieces.service";

@Module({
  imports: [BrandKitModule],
  controllers: [ContentPiecesController],
  providers: [ContentPiecesService],
})
export class ContentPiecesModule {}
