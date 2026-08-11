import { FlowExecutorProcessor } from "./flow-executor.processor";
import { SendDmHandler } from "./step-handlers/send-dm.handler";
import { SendQuickRepliesHandler } from "./step-handlers/send-quick-replies.handler";
import { WaitHandler } from "./step-handlers/wait.handler";
import { TagContactHandler } from "./step-handlers/tag-contact.handler";

const SOCIAL_ACCOUNT = {
  id: "social-1",
  workspaceId: "ws-1",
  accessTokenEncrypted: "encrypted-token",
};

function buildStep(overrides: Partial<{ stepOrder: number; stepType: string; payload: unknown }> = {}) {
  return {
    id: `step-${overrides.stepOrder ?? 1}`,
    automationFlowId: "flow-1",
    stepOrder: 1,
    stepType: "send_dm",
    payload: { text: "Oi!" },
    ...overrides,
  };
}

function buildDeps(steps: ReturnType<typeof buildStep>[]) {
  const prisma = {
    automationFlowStep: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { automationFlowId_stepOrder: { stepOrder: number } } }) =>
        Promise.resolve(steps.find((s) => s.stepOrder === where.automationFlowId_stepOrder.stepOrder) ?? null),
      ),
    },
    socialAccount: { findUnique: jest.fn().mockResolvedValue(SOCIAL_ACCOUNT) },
    automationRun: { update: jest.fn().mockResolvedValue({}) },
  };
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const tokenEncryption = { decrypt: jest.fn().mockReturnValue("real-access-token") };
  const sendDmHandler = { execute: jest.fn().mockResolvedValue({}) };
  const sendQuickRepliesHandler = { execute: jest.fn().mockResolvedValue({}) };
  const waitHandler = new WaitHandler();
  const tagContactHandler = { execute: jest.fn().mockResolvedValue({}) };

  const processor = new FlowExecutorProcessor(
    prisma as never,
    queue as never,
    tokenEncryption as never,
    sendDmHandler as unknown as SendDmHandler,
    sendQuickRepliesHandler as unknown as SendQuickRepliesHandler,
    waitHandler as unknown as WaitHandler,
    tagContactHandler as unknown as TagContactHandler,
  );

  return { processor, prisma, queue, tokenEncryption, sendDmHandler, sendQuickRepliesHandler, tagContactHandler };
}

function buildJob(stepOrder: number) {
  return {
    data: { runId: "run-1", automationFlowId: "flow-1", socialAccountId: "social-1", contactId: "contact-1", stepOrder },
  } as never;
}

describe("FlowExecutorProcessor", () => {
  it("CA-01: send_dm seguido de wait avança pro próximo step com o delay certo, sem bloquear", async () => {
    const steps = [
      buildStep({ stepOrder: 1, stepType: "send_dm", payload: { text: "Oi!" } }),
      buildStep({ stepOrder: 2, stepType: "wait", payload: { seconds: 5 } }),
      buildStep({ stepOrder: 3, stepType: "send_quick_replies", payload: { text: "Escolha:", options: ["A", "B"] } }),
    ];
    const { processor, queue, sendDmHandler } = buildDeps(steps);

    await processor.process(buildJob(1));
    expect(sendDmHandler.execute).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith("execute-step", expect.objectContaining({ stepOrder: 2 }), undefined);

    await processor.process(buildJob(2));
    // step "wait" não chama nenhum handler de mensageria — só agenda o próximo com delay.
    expect(queue.add).toHaveBeenCalledWith(
      "execute-step",
      expect.objectContaining({ stepOrder: 3 }),
      { delay: 5000 },
    );
  });

  it("CA-02: falha num step marca o run como failed com mensagem específica, sem lançar", async () => {
    const steps = [buildStep({ stepOrder: 1, stepType: "send_dm", payload: { text: "Oi!" } })];
    const { processor, prisma, sendDmHandler } = buildDeps(steps);
    sendDmHandler.execute.mockRejectedValue(new Error("janela de 24h expirada"));

    await expect(processor.process(buildJob(1))).resolves.toBeUndefined();

    expect(prisma.automationRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { status: "failed", errorMessage: "janela de 24h expirada" },
    });
  });

  it("marca o run como completed quando não há mais steps", async () => {
    const { processor, prisma } = buildDeps([]);

    await processor.process(buildJob(1));

    expect(prisma.automationRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { status: "completed" },
    });
  });

  it("tag_contact executa sem chamar a API de mensageria (sem efeito externo)", async () => {
    const steps = [buildStep({ stepOrder: 1, stepType: "tag_contact", payload: { tag: "interessado" } })];
    const { processor, tagContactHandler, sendDmHandler } = buildDeps(steps);

    await processor.process(buildJob(1));

    expect(tagContactHandler.execute).toHaveBeenCalledWith({ tag: "interessado" }, expect.any(Object), "ws-1");
    expect(sendDmHandler.execute).not.toHaveBeenCalled();
  });
});
