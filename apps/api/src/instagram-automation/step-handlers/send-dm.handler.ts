import { Injectable } from "@nestjs/common";
import { InstagramMessagingClient } from "../instagram-messaging.client";
import type { StepExecutionContext, StepHandlerResult } from "./step-handler.types";

@Injectable()
export class SendDmHandler {
  constructor(private readonly messagingClient: InstagramMessagingClient) {}

  async execute(payload: { text?: string }, context: StepExecutionContext): Promise<StepHandlerResult> {
    if (!payload.text) {
      throw new Error('Step "send_dm" sem "text" no payload.');
    }
    await this.messagingClient.sendTextMessage(context.accessToken, context.contactId, payload.text);
    return {};
  }
}
