import { Injectable } from "@nestjs/common";
import { InstagramMessagingClient } from "../instagram-messaging.client";
import type { StepExecutionContext, StepHandlerResult } from "./step-handler.types";

@Injectable()
export class SendQuickRepliesHandler {
  constructor(private readonly messagingClient: InstagramMessagingClient) {}

  async execute(payload: { text?: string; options?: string[] }, context: StepExecutionContext): Promise<StepHandlerResult> {
    if (!payload.text || !payload.options?.length) {
      throw new Error('Step "send_quick_replies" sem "text"/"options" no payload.');
    }
    await this.messagingClient.sendQuickReplies(
      context.accessToken,
      context.contactId,
      payload.text,
      payload.options.map((title) => ({ title, payload: title })),
    );
    return {};
  }
}
