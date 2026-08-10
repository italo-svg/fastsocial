import { Injectable, NotImplementedException } from "@nestjs/common";
import { AnthropicService } from "../common/services/anthropic.service";
import { buildCopyPrompt, buildCopyTool, CopyFormat } from "../copy-generation/prompt-templates";
import { interpolate } from "./system-prompts.service";
import { PromptKey } from "./default-prompts";

// Dados fixos de teste — nunca tocam workspace/brandKit/content_piece reais
// (CA-04). Imagem pública estável só pra exercitar qa_vision de verdade sem
// depender de um job de imagem real já existente.
const TEST_FIXTURE = {
  niche: "Consultoria de produtividade",
  toneOfVoice: "Direto e prático",
  contextText: "Dica de produtividade para pequenos negócios: como organizar a agenda da semana.",
  copyText: "Como organizar a agenda da semana em 15 minutos",
  toneKeywords: ["direto", "prático", "confiável"],
  negativeSpaceInstruction: "Composition leaves clear negative space in the bottom third for text overlay.",
  brandName: "Marca de Teste",
  colorStory: "azul e branco, tons neutros",
  testImageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800",
};

export interface PromptTestResult {
  output: string;
  note: string;
}

// Serviço DEDICADO de teste (spec 049) — em vez de reusar os endpoints reais
// de geração (que são por workspace e, no caso de imagem, persistem
// ImageGenerationJob e custam dinheiro no fal.ai), reimplementa a MESMA
// chamada de IA com dados fixos e sem nenhuma escrita no Prisma. Prompts
// puramente estáticos (negative_list/slot_constraint/brand_identity_lock)
// nem chamam IA — o "teste" é só a interpolação local.
@Injectable()
export class PromptTestService {
  constructor(private readonly anthropic: AnthropicService) {}

  async test(key: PromptKey, draftContent: string): Promise<PromptTestResult> {
    switch (key) {
      case "copy_generation_static_post":
      case "copy_generation_carousel":
      case "copy_generation_reels_script":
        return this.testCopyGeneration(key, draftContent);
      case "scene_director":
        return this.testSceneDirector(draftContent);
      case "qa_vision":
        return this.testQaVision(draftContent);
      case "image_negative_list":
      case "image_slot_constraint":
        return { output: draftContent, note: "Camada estática — sem interpolação, sem chamada de IA." };
      case "image_brand_identity_lock_template":
        return this.testBrandIdentityLock(draftContent);
    }
  }

  private requireAnthropic(): void {
    if (!this.anthropic.isConfigured()) {
      throw new NotImplementedException("Teste indisponível: ANTHROPIC_API_KEY não configurada.");
    }
  }

  private async testCopyGeneration(key: PromptKey, draftContent: string): Promise<PromptTestResult> {
    this.requireAnthropic();
    const format = key.replace("copy_generation_", "") as CopyFormat;
    const formatInstruction = interpolate(draftContent, { slideCount: "5" });
    const prompt = buildCopyPrompt(
      {
        format,
        niche: TEST_FIXTURE.niche,
        toneOfVoice: TEST_FIXTURE.toneOfVoice,
        contextText: TEST_FIXTURE.contextText,
        slideCount: 5,
      },
      formatInstruction,
    );
    const tool = buildCopyTool(format);
    const result = await this.anthropic.completeWithTool<Record<string, unknown>>({
      system: "Você é um redator publicitário brasileiro, especialista em copy para redes sociais.",
      prompt,
      tool,
    });
    return { output: JSON.stringify(result, null, 2), note: "Geração de teste — nenhum dado de produção foi criado." };
  }

  private async testSceneDirector(draftContent: string): Promise<PromptTestResult> {
    this.requireAnthropic();
    const output = await this.anthropic.complete({
      system: draftContent,
      prompt:
        `Tema do post: "${TEST_FIXTURE.copyText}"\nNicho: ${TEST_FIXTURE.niche}\n` +
        `Tom: ${TEST_FIXTURE.toneKeywords.join(", ")}\n` +
        `Instrução de espaço negativo a incluir: "${TEST_FIXTURE.negativeSpaceInstruction}"`,
      maxTokens: 200,
    });
    return { output, note: "Chamada de teste ao Claude — nenhum job de imagem foi criado." };
  }

  private async testQaVision(draftContent: string): Promise<PromptTestResult> {
    this.requireAnthropic();
    const output = await this.anthropic.completeWithImage({
      system: draftContent,
      prompt: `Avalie esta imagem de teste para uma marca do nicho "${TEST_FIXTURE.niche}", tom de voz "${TEST_FIXTURE.toneOfVoice}".`,
      imageUrl: TEST_FIXTURE.testImageUrl,
      maxTokens: 300,
    });
    return { output, note: "QA de teste contra uma imagem pública fixa — nenhum job real foi avaliado." };
  }

  private testBrandIdentityLock(draftContent: string): PromptTestResult {
    const output = interpolate(draftContent, {
      brandName: TEST_FIXTURE.brandName,
      niche: TEST_FIXTURE.niche,
      toneKeywords: TEST_FIXTURE.toneKeywords.join(", "),
      colorStory: TEST_FIXTURE.colorStory,
    });
    return { output, note: "Interpolação local de teste — sem chamada de IA." };
  }
}
