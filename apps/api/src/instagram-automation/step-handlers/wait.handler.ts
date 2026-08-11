import { Injectable } from "@nestjs/common";
import type { StepHandlerResult } from "./step-handler.types";

@Injectable()
export class WaitHandler {
  // CA-01: nunca bloqueia a thread do worker — só devolve o delay em ms pro
  // processor usar como opção nativa do BullMQ (`{ delay }`) ao enfileirar o
  // próximo step, mesmo espírito do resto do produto (spec 030: "nunca sleep
  // bloqueante").
  execute(payload: { seconds?: number }): StepHandlerResult {
    const seconds = payload.seconds ?? 0;
    return { delayMs: Math.max(0, seconds) * 1000 };
  }
}
