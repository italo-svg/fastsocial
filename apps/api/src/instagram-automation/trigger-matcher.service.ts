import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface MatchedFlow {
  automationFlowId: string;
  triggerId: string;
}

@Injectable()
export class TriggerMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  // item 4 do spec: se mais de um gatilho bater, dispara TODOS (MVP simples,
  // sem priorização) — correspondência por palavra-chave CONTIDA, não exata,
  // case-insensitive.
  async findMatchingFlows(socialAccountId: string, triggerType: string, text: string): Promise<MatchedFlow[]> {
    const triggers = await this.prisma.automationTrigger.findMany({
      where: {
        socialAccountId,
        triggerType,
        flow: { isActive: true },
      },
      include: { flow: true },
    });

    const normalizedText = text.toLowerCase();
    return triggers
      .filter((trigger) => normalizedText.includes(trigger.matchValue.toLowerCase()))
      .map((trigger) => ({ automationFlowId: trigger.automationFlowId, triggerId: trigger.id }));
  }
}
