import { Module } from "@nestjs/common";
import { CopyGenerationController } from "./copy-generation.controller";
import { CopyGenerationService } from "./copy-generation.service";
import { AnthropicService } from "../common/services/anthropic.service";
import { SystemPromptsModule } from "../system-prompts/system-prompts.module";

@Module({
  imports: [SystemPromptsModule],
  controllers: [CopyGenerationController],
  providers: [CopyGenerationService, AnthropicService],
  exports: [CopyGenerationService],
})
export class CopyGenerationModule {}
