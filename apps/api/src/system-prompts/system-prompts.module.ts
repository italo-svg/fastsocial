import { Module } from "@nestjs/common";
import { SystemPromptsController } from "./system-prompts.controller";
import { SystemPromptsService } from "./system-prompts.service";
import { PromptTestService } from "./prompt-test.service";
import { AnthropicService } from "../common/services/anthropic.service";

@Module({
  controllers: [SystemPromptsController],
  providers: [SystemPromptsService, PromptTestService, AnthropicService],
  exports: [SystemPromptsService],
})
export class SystemPromptsModule {}
