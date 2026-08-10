import { Module } from "@nestjs/common";
import { StockImagesController } from "./stock-images.controller";
import { StockImagesService } from "./stock-images.service";
import { UnsplashAdapter } from "./adapters/unsplash.adapter";
import { PexelsAdapter } from "./adapters/pexels.adapter";

@Module({
  controllers: [StockImagesController],
  providers: [StockImagesService, UnsplashAdapter, PexelsAdapter],
  exports: [StockImagesService],
})
export class ImageSourcesModule {}
