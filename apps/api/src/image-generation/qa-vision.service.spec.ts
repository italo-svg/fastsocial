import { QaVisionService } from "./qa-vision.service";

function buildJob(overrides: Partial<{ attemptNumber: number; resultImageUrl: string | null }> = {}) {
  return {
    id: "job-1",
    contentSlideId: "slide-1",
    resultImageUrl: "https://example.com/image.png",
    attemptNumber: 1,
    ...overrides,
    contentSlide: {
      contentPiece: {
        workspace: {
          brandKit: {
            niche: "Moda fitness feminina",
            toneOfVoice: "Direto e motivador",
            colorPalette: { primary: "#4F46E5" },
          },
        },
      },
    },
  };
}

function buildDeps(job: ReturnType<typeof buildJob>) {
  const prisma = {
    imageGenerationJob: {
      findFirst: jest.fn().mockResolvedValue(job),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...job, ...data })),
    },
    contentSlide: {
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const anthropic = { completeWithImage: jest.fn() };
  const imageGenerationService = { createJob: jest.fn().mockResolvedValue({}) };
  const config = { get: jest.fn().mockReturnValue(undefined) };

  const service = new QaVisionService(
    prisma as never,
    anthropic as never,
    imageGenerationService as never,
    config as never,
  );

  return { service, prisma, anthropic, imageGenerationService, config };
}

describe("QaVisionService", () => {
  it("CA-01: scores altos marcam qa_passed e atualizam o background_image_url do slide", async () => {
    const job = buildJob({ attemptNumber: 1 });
    const { service, prisma, anthropic } = buildDeps(job);
    anthropic.completeWithImage.mockResolvedValue(
      JSON.stringify({ brandFitScore: 9, artifactScore: 8.5, negativeSpaceScore: 9, reasoning: "ok" }),
    );

    const result = await service.evaluate("ws-1", "job-1");

    expect(prisma.contentSlide.update).toHaveBeenCalledWith({
      where: { id: "slide-1" },
      data: { backgroundImageUrl: "https://example.com/image.png" },
    });
    expect(prisma.imageGenerationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "qa_passed" }) }),
    );
    expect((result as { status: string }).status).toBe("qa_passed");
  });

  it("CA-02: score abaixo do threshold com attemptNumber < 3 dispara nova geracao incrementando a tentativa", async () => {
    const job = buildJob({ attemptNumber: 1 });
    const { service, prisma, anthropic, imageGenerationService } = buildDeps(job);
    anthropic.completeWithImage.mockResolvedValue(
      JSON.stringify({ brandFitScore: 2, artifactScore: 3, negativeSpaceScore: 2, reasoning: "ruim" }),
    );

    await service.evaluate("ws-1", "job-1");

    expect(prisma.imageGenerationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "qa_rejected" }) }),
    );
    expect(imageGenerationService.createJob).toHaveBeenCalledWith("ws-1", {
      contentSlideId: "slide-1",
      attemptNumber: 2,
    });
    expect(prisma.contentSlide.update).not.toHaveBeenCalled();
  });

  it("CA-03: apos atingir o limite de tentativas, escala para humano e nao regenera mais", async () => {
    const job = buildJob({ attemptNumber: 3 });
    const { service, prisma, anthropic, imageGenerationService } = buildDeps(job);
    anthropic.completeWithImage.mockResolvedValue(
      JSON.stringify({ brandFitScore: 1, artifactScore: 1, negativeSpaceScore: 1, reasoning: "ruim" }),
    );

    const result = await service.evaluate("ws-1", "job-1");

    expect(imageGenerationService.createJob).not.toHaveBeenCalled();
    expect((result as { status: string }).status).toBe("escalated_to_human");
  });

  it("CA-04: os 3 scores e o reasoning ficam registrados tanto em aprovacao quanto em reprovacao", async () => {
    const job = buildJob({ attemptNumber: 1 });
    const { service, prisma, anthropic } = buildDeps(job);
    anthropic.completeWithImage.mockResolvedValue(
      JSON.stringify({ brandFitScore: 9, artifactScore: 8, negativeSpaceScore: 7, reasoning: "boa imagem" }),
    );

    await service.evaluate("ws-1", "job-1");

    expect(prisma.imageGenerationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qaBrandFitScore: 9,
          qaArtifactScore: 8,
          qaNegativeSpaceScore: 7,
        }),
      }),
    );
  });

  it("CA-05: background_image_url nunca e atualizado quando o resultado nao e qa_passed", async () => {
    const job = buildJob({ attemptNumber: 2 });
    const { service, prisma, anthropic } = buildDeps(job);
    anthropic.completeWithImage.mockResolvedValue(
      JSON.stringify({ brandFitScore: 3, artifactScore: 3, negativeSpaceScore: 3, reasoning: "ruim" }),
    );

    await service.evaluate("ws-1", "job-1");

    expect(prisma.contentSlide.update).not.toHaveBeenCalled();
  });

  it("CA-06: falha repetida na API da Anthropic nao trava o worker — reprova com retry limitado e escala por seguranca", async () => {
    const job = buildJob({ attemptNumber: 1 });
    const { service, prisma, anthropic, imageGenerationService } = buildDeps(job);
    anthropic.completeWithImage.mockRejectedValue(new Error("timeout"));

    const result = await service.evaluate("ws-1", "job-1");

    expect(anthropic.completeWithImage).toHaveBeenCalledTimes(3);
    expect(imageGenerationService.createJob).not.toHaveBeenCalled();
    expect((result as { status: string }).status).toBe("qa_failed");
  });
});
