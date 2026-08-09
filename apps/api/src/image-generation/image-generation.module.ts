import { Module } from "@nestjs/common";
import { ImageGenerationController } from "./image-generation.controller";
import { ImageGenerationService } from "./image-generation.service";
import { PromptBuilderService } from "./prompt-builder.service";
import { FalFluxProvider } from "./providers/fal-flux.provider";
import { AnthropicService } from "../common/services/anthropic.service";

@Module({
  controllers: [ImageGenerationController],
  providers: [ImageGenerationService, PromptBuilderService, FalFluxProvider, AnthropicService],
})
export class ImageGenerationModule {}
