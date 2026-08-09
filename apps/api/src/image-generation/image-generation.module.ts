import { Module } from "@nestjs/common";
import { ImageGenerationController } from "./image-generation.controller";
import { ImageGenerationService } from "./image-generation.service";
import { PromptBuilderService } from "./prompt-builder.service";
import { FalFluxProvider } from "./providers/fal-flux.provider";
import { AnthropicService } from "../common/services/anthropic.service";
import { QaVisionController } from "./qa-vision.controller";
import { QaVisionService } from "./qa-vision.service";
import { SceneDirectorService } from "./scene-director.service";

@Module({
  controllers: [ImageGenerationController, QaVisionController],
  providers: [
    ImageGenerationService,
    PromptBuilderService,
    SceneDirectorService,
    FalFluxProvider,
    AnthropicService,
    QaVisionService,
  ],
})
export class ImageGenerationModule {}
