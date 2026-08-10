import { Module } from "@nestjs/common";
import { SupportChatController } from "./support-chat.controller";
import { SupportChatService } from "./support-chat.service";
import { AnthropicService } from "../common/services/anthropic.service";
import { HelpCenterModule } from "../help-center/help-center.module";

@Module({
  imports: [HelpCenterModule],
  controllers: [SupportChatController],
  providers: [SupportChatService, AnthropicService],
})
export class SupportChatModule {}
