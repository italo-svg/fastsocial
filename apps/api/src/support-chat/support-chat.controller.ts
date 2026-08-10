import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { SupportChatService } from "./support-chat.service";
import { SendMessageDto } from "./dto/send-message.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("support-chat")
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Post("messages")
  sendMessage(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportChatService.sendMessage(workspace.id, user.id, dto);
  }
}
