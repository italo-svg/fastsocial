# 017 Motor de Geração de Imagem por IA

## Objetivo
Implementar a geração de imagem de fundo por IA como fonte de imagem de primeira classe, seguindo uma arquitetura de prompt em camadas desenhada especificamente para maximizar fidelidade de marca e minimizar a aparência de "imagem gerada por IA".

## Contexto
Esta é a spec de maior risco de qualidade percebida do produto inteiro — o requisito explícito do dono do produto foi: "estrutura de prompt de geração de imagem com IA MUITO sólida para ser sempre muito fiel à marca e evitar ao máximo parecer imagem de IA". A arquitetura completa está documentada em **`.prd/prd_autocontent_os.md`, Seção 7.7** — leia essa seção inteira antes de implementar, ela é a fonte da verdade normativa para este spec, não apenas uma referência.

Três decisões estruturais não-negociáveis (repetidas aqui porque são o núcleo do spec):
1. **A IA gera só o fundo/cenário**, nunca texto, logo ou headline — isso é composto depois pelo render-engine (spec `015`). Este serviço nunca deve ser solicitado a colocar texto legível na imagem.
2. **Geração é sempre condicionada por imagens de referência reais da marca** (`brand_kits.reference_images`, coletadas no onboarding, spec `010`/`011`) via image-conditioning — nunca text-to-image puro.
3. **Todo resultado passa por QA automático por visão** (spec `018`) antes de estar disponível para uso — este spec (`017`) só gera e entrega a imagem candidata; a aprovação/reprovação é do spec `018`.

## Stack
- **Framework**: NestJS (módulo dentro de `apps/api`, ou serviço dedicado se o volume justificar — MVP: módulo na API mesmo, mesma decisão de simplicidade do spec `013`).
- **Provider de geração de imagem**: Flux.1 via **fal.ai** (adapter principal) — API REST com suporte a image-conditioning (parâmetro `image_prompt` ou equivalente do endpoint fal.ai `flux-pro/v1.1-ultra` ou `flux-lora`, checar documentação atual do provider no momento da implementação). Implementar como interface `ImageGenerationProvider` para permitir trocar por Replicate sem reescrever o resto.
- **LLM para montagem de prompt**: Claude (Anthropic API), reusando o `AnthropicService` que o spec `022` também usa — se `022` ainda não existir quando este spec rodar, criar `apps/api/src/common/services/anthropic.service.ts` aqui e o spec `022` reusa.
- **Variáveis de ambiente necessárias**: `FAL_API_KEY`, `ANTHROPIC_API_KEY`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `010-crud-brand-kit-api` — precisa de `reference_images` e `color_palette`/`tone_of_voice` do brand kit.
- [ ] `003-schema-postgres-core` — precisa da tabela `image_generation_jobs`.

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/image-generation/image-generation.module.ts`
- `apps/api/src/modules/image-generation/image-generation.controller.ts` — `POST /image-generation/jobs` (dispara uma geração para um `content_slide_id` específico), `GET /image-generation/jobs/:id`.
- `apps/api/src/modules/image-generation/image-generation.service.ts` — orquestra as 6 camadas de prompt e chama o provider.
- `apps/api/src/modules/image-generation/prompt-builder.service.ts` — monta o prompt final combinando as camadas (ver "Lógica principal").
- `apps/api/src/modules/image-generation/providers/fal-flux.provider.ts` — implementa `ImageGenerationProvider.generate(prompt, referenceImages[], aspectRatio)`.
- `apps/api/src/modules/image-generation/providers/image-generation-provider.interface.ts`
- `apps/api/src/common/services/anthropic.service.ts` (se ainda não existir) — wrapper fino sobre `@anthropic-ai/sdk`.

### Lógica principal — as 6 camadas do prompt (replicar exatamente a estrutura do PRD 7.7)

1. **BRAND IDENTITY LOCK** — montada a partir de `brand_kit.niche`, `brand_kit.tone_of_voice` (extrair 3-5 palavras-chave de tom via Claude, ou usar campo dedicado se existir) e `brand_kit.color_palette` (nomes de cor, não hex): *"Photography direction for {brand_name}, a {niche} brand. Visual signature: {tone_keywords}. Color story: {paleta em nomes}, used only as accent tones in props, wardrobe or lighting gel — never as a flat graphic background fill."*
2. **SCENE BRIEF** — chamada a Claude (não escrita manualmente): dado o `copy_text`/insight daquele slide, gera 2-3 frases descrevendo cenário/sujeito/ação/mood + instrução de espaço negativo baseada na posição da zona de texto no `slot_map` daquele template (ex: se a zona de texto fica no terço inferior, pedir *"clear negative space in the bottom third"*).
3. **PHOTOGRAPHIC TECHNICAL SPEC** — fixo por brand kit, mas parametrizável: lente/luz/textura + aspect ratio derivado do `targetNetwork`/`targetFormat` (reusar a tabela `networkFormats` do spec `015`).
4. **REFERENCE CONDITIONING** — não é texto: seleciona 1-3 imagens de `brand_kit.reference_images` (aleatório ponderado ou as mais recentes — MVP: as 3 primeiras cadastradas) e passa como `image_prompt` no payload do provider, peso 0.35-0.55 (configurável via env `IMAGE_GEN_REFERENCE_WEIGHT`, default 0.45).
5. **NEGATIVE / EXCLUSION LIST** — string fixa, igual para todas as gerações (copiar literalmente do PRD 7.7): sem texto legível, sem logos, sem watermark, sem mãos/rostos distorcidos, sem pele plástica, sem simetria de rosto de IA, sem HDR saturado, sem composição de stock genérica, sem clipart, sem membros extras, sem expressão uncanny valley.
6. **SLOT CONSTRAINT** — reforça a decisão estrutural #1: *"Generate background/scene only — this image will be composited with logo and text afterward. Leave the designated text-safe zone visually calm."*

**Fluxo de execução:**
1. `POST /image-generation/jobs` recebe `content_slide_id`. Busca `content_slide` → `content_piece` → `brand_kit` do workspace + `template.slot_map` (para saber onde fica a zona de texto daquele slide).
2. Monta as 6 camadas via `prompt-builder.service.ts`, concatena em um único prompt final.
3. Cria um registro em `image_generation_jobs` com `status='pending'`, `assembled_prompt` salvo (auditoria), `attempt_number=1`.
4. Chama o provider (`fal-flux.provider.ts`) com o prompt + as imagens de referência selecionadas.
5. Ao receber o resultado, atualiza o job com `result_image_url` e `status='pending'` ainda (QA acontece no spec `018`, que consome jobs `status='pending'` com `result_image_url` preenchido).
6. **Não** chama o QA diretamente aqui — publica um evento/job na fila (BullMQ, Redis já disponível) que o spec `018` consome, mantendo os dois specs desacoplados.

### Schema / Tipos (se aplicável)
```typescript
interface ImageGenerationProvider {
  generate(params: {
    prompt: string;
    referenceImageUrls: string[];
    referenceWeight: number;
    aspectRatio: string; // "1:1" | "4:5" | "9:16"
  }): Promise<{ imageUrl: string; providerJobId: string }>;
}
```

## Critérios de Aceitação
- [ ] CA-01: `POST /image-generation/jobs` para um slide com brand kit configurado e `reference_images` preenchidas gera um `image_generation_jobs` com `assembled_prompt` contendo claramente as 6 camadas (verificável lendo o texto salvo).
- [ ] CA-02: O prompt final **nunca** inclui instrução para gerar texto legível, logo ou marca d'água — sempre inclui a negative list completa.
- [ ] CA-03: A chamada ao provider sempre inclui ao menos 1 imagem de referência quando `brand_kit.reference_images` tem ao menos 1 item; se `reference_images` estiver vazio, o job é criado mas com um aviso registrado (`status='pending'`, mas com nota indicando geração sem conditioning — qualidade não garantida).
- [ ] CA-04: Sem `FAL_API_KEY` configurada, `POST /image-generation/jobs` retorna 501 claro, sem quebrar outros fluxos do sistema (mesmo padrão do spec `016`).
- [ ] CA-05: `attempt_number` incrementa corretamente em regenerações do mesmo slide (o spec `018` vai chamar este serviço de novo em caso de QA reprovado, até 2 tentativas — este spec só precisa aceitar e registrar `attempt_number` vindo do caller).
- [ ] CA-06: Todo job de geração fica auditável via `GET /image-generation/jobs/:id` — prompt usado, imagens de referência usadas, resultado, tudo consultável depois.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/image-generation/jobs -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"contentSlideId":"<slide-id>"}'
curl -s http://localhost:3333/api/v1/image-generation/jobs/<job-id> -H "Authorization: Bearer <token>"
```

## Notas de Implementação
- O peso de conditioning (0.35-0.55) e o provider exato (fal.ai vs. Replicate) devem ficar fáceis de trocar via env var — este é o parâmetro mais provável de precisar ajuste fino depois de ver resultados reais com clientes de verdade.
- **Nunca** deixar o texto/copy do post vazar para dentro do prompt de imagem como se fosse para ser desenhado na cena — o `copy_text` só influencia o `SCENE BRIEF` (camada 2) como contexto temático, nunca como instrução de renderizar aquele texto na imagem.
