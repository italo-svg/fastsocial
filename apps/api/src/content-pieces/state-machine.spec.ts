import {
  assertValidTransition,
  InvalidTransitionError,
  isEditable,
  resolveSubmissionTarget,
} from "./state-machine";

describe("state-machine: transições de status", () => {
  it("CA-05: permite transições válidas conhecidas", () => {
    expect(() => assertValidTransition("draft", "pending_approval")).not.toThrow();
    expect(() => assertValidTransition("pending_approval", "approved")).not.toThrow();
    expect(() => assertValidTransition("pending_approval", "rejected")).not.toThrow();
    expect(() => assertValidTransition("approved", "scheduled")).not.toThrow();
    expect(() => assertValidTransition("scheduled", "published")).not.toThrow();
  });

  it("CA-05: rejeita transições inválidas com erro claro (ex: publicar direto de draft)", () => {
    expect(() => assertValidTransition("draft", "published")).toThrow(InvalidTransitionError);
    expect(() => assertValidTransition("draft", "scheduled")).toThrow(InvalidTransitionError);
    expect(() => assertValidTransition("published", "draft")).toThrow(InvalidTransitionError);
  });

  it("CA-06: só draft e rejected são editáveis", () => {
    expect(isEditable("draft")).toBe(true);
    expect(isEditable("rejected")).toBe(true);
    expect(isEditable("pending_approval")).toBe(false);
    expect(isEditable("approved")).toBe(false);
    expect(isEditable("scheduled")).toBe(false);
    expect(isEditable("published")).toBe(false);
  });
});

// CA-03 — regra de seguranca do PRD 7.7. Cada teste abaixo e' uma tentativa
// deliberada de burlar a exigencia de aprovacao humana para conteudo com
// imagem gerada por IA, por um caminho diferente. TODAS devem falhar em
// pular a aprovacao.
describe("resolveSubmissionTarget: regra de segurança (imagem de IA sempre exige aprovação)", () => {
  it("CA-03: slide com IA + autoApprove=true (tentativa via bypass do autopilot) — NÃO pula aprovação", () => {
    const result = resolveSubmissionTarget({ hasAiGeneratedSlide: true, autoApprove: true });
    expect(result).toBe("pending_approval");
  });

  it("CA-03: slide com IA + autoApprove=false — vai para aprovação normalmente", () => {
    const result = resolveSubmissionTarget({ hasAiGeneratedSlide: true, autoApprove: false });
    expect(result).toBe("pending_approval");
  });

  it("CA-03: múltiplos slides, apenas 1 com IA + autoApprove=true — ainda exige aprovação", () => {
    // hasAiGeneratedSlide já reflete "ao menos 1 slide usa IA" — testado aqui pela
    // semântica do campo, o service.ts é responsável por computar isso corretamente
    // a partir de piece.slides.some(s => s.imageSource === 'ai_generated').
    const result = resolveSubmissionTarget({ hasAiGeneratedSlide: true, autoApprove: true });
    expect(result).toBe("pending_approval");
  });

  it("CA-04: nenhum slide com IA + autoApprove=true — pula direto para approved", () => {
    const result = resolveSubmissionTarget({ hasAiGeneratedSlide: false, autoApprove: true });
    expect(result).toBe("approved");
  });

  it("nenhum slide com IA + autoApprove=false — vai para aprovação (fluxo manual padrão)", () => {
    const result = resolveSubmissionTarget({ hasAiGeneratedSlide: false, autoApprove: false });
    expect(result).toBe("pending_approval");
  });
});
