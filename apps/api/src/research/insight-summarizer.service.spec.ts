import { InsightSummarizerService } from "./insight-summarizer.service";
import type { RawSignal } from "./sources/trend-source.interface";

function buildSignals(count: number): RawSignal[] {
  return Array.from({ length: count }, (_, i) => ({
    sourceType: "competitor" as const,
    sourceRef: `concorrente-${i}`,
    rawText: `Anúncio de teste ${i}`,
  }));
}

describe("InsightSummarizerService", () => {
  it("CA-04: faz uma única chamada a Claude por scan, independente do número de sinais", async () => {
    const anthropic = {
      complete: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify([
            { summary: "Tema A", relevanceScore: 8, suggestedFormat: "carousel", sourceRefs: ["concorrente-0"] },
          ]),
        ),
    };
    const service = new InsightSummarizerService(anthropic as never);

    await service.summarize(buildSignals(7), "Moda fitness");

    expect(anthropic.complete).toHaveBeenCalledTimes(1);
  });

  it("CA-05: relevanceScore e suggestedFormat sempre preenchidos após síntese bem-sucedida", async () => {
    const anthropic = {
      complete: jest.fn().mockResolvedValue(
        JSON.stringify([
          { summary: "Tema A", relevanceScore: 7, suggestedFormat: "static_post", sourceRefs: [] },
          { summary: "Tema B", relevanceScore: 5, suggestedFormat: "reels_script", sourceRefs: ["concorrente-1"] },
        ]),
      ),
    };
    const service = new InsightSummarizerService(anthropic as never);

    const result = await service.summarize(buildSignals(3), "Moda fitness");

    expect(result).toHaveLength(2);
    for (const insight of result) {
      expect(typeof insight.relevanceScore).toBe("number");
      expect(insight.suggestedFormat).toBeTruthy();
    }
  });

  it("não chama Claude quando não há sinais coletados", async () => {
    const anthropic = { complete: jest.fn() };
    const service = new InsightSummarizerService(anthropic as never);

    const result = await service.summarize([], "Moda fitness");

    expect(anthropic.complete).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
