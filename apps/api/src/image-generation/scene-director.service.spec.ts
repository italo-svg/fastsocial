import { SceneDirectorService, type TextZonePosition } from "./scene-director.service";

function buildService(anthropicResponse: string | Error) {
  const anthropic = {
    complete:
      anthropicResponse instanceof Error
        ? jest.fn().mockRejectedValue(anthropicResponse)
        : jest.fn().mockResolvedValue(anthropicResponse),
  };
  return { service: new SceneDirectorService(anthropic as never), anthropic };
}

const BASE_INPUT = {
  copyText: "Dica de produtividade para empreendedores",
  niche: "Consultoria de produtividade",
  toneKeywords: ["direto", "prático"],
};

describe("SceneDirectorService", () => {
  it("CA-01: scene brief não menciona texto/palavras a serem desenhadas na imagem", async () => {
    const { service } = buildService(
      "A focused entrepreneur organizes sticky notes on a clean desk, morning light. " +
        "Composition leaves clear negative space in the bottom third for text overlay.",
    );

    const result = await service.buildSceneBrief({ ...BASE_INPUT, textZonePosition: "bottom" });

    expect(result.toLowerCase()).not.toMatch(/\btext\b|\bwords\b|\btypography\b/);
  });

  it.each<[TextZonePosition, string]>([
    ["top", "top third"],
    ["bottom", "bottom third"],
    ["left", "left side"],
    ["right", "right side"],
    ["center", "center"],
  ])("CA-02: textZonePosition=%s sempre inclui a instrução correspondente", async (position, expectedFragment) => {
    const { service } = buildService("Uma cena qualquer sem a instrução.");

    const result = await service.buildSceneBrief({ ...BASE_INPUT, textZonePosition: position });

    expect(result).toContain(expectedFragment);
  });

  it("CA-03: nunca excede 3 frases mesmo se o LLM retornar um texto mais longo", async () => {
    const longResponse =
      "Frase um sobre o cenário. Frase dois sobre o sujeito. Frase três sobre o mood. " +
      "Frase quatro que não deveria aparecer. Frase cinco também não.";
    const { service } = buildService(longResponse);

    const result = await service.buildSceneBrief({ ...BASE_INPUT, textZonePosition: "top" });

    expect(result).not.toContain("Frase quatro");
    expect(result).not.toContain("Frase cinco");
  });

  it("usa fallback determinístico sem quebrar quando a chamada à Anthropic falha", async () => {
    const { service } = buildService(new Error("timeout"));

    const result = await service.buildSceneBrief({ ...BASE_INPUT, textZonePosition: "right" });

    expect(result).toContain("right side");
    expect(result.length).toBeGreaterThan(0);
  });
});
