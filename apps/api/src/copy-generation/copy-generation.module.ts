import { Module } from "@nestjs/common";
import { CopyGenerationController } from "./copy-generation.controller";
import { CopyGenerationService } from "./copy-generation.service";
import { AnthropicService } from "../common/services/anthropic.service";

@Module({
  controllers: [CopyGenerationController],
  providers: [CopyGenerationService, AnthropicService],
})
export class CopyGenerationModule {}
