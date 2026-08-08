# 018 QA por Visão — Imagem IA

## Objetivo
Avaliar automaticamente cada imagem gerada por IA (spec `017`) em três eixos — aderência à marca, artefato de IA visível, espaço negativo para overlay — e decidir entre aprovar, regenerar automaticamente, ou escalar para revisão humana.

## Contexto
Segue diretamente o spec `017`. Este é o "portão de qualidade" descrito no PRD Seção 7.7, passo 3-4 do fluxo de geração. Sem este spec, imagens de IA de baixa qualidade (mãos deformadas, texto fantasma, fuga total da paleta da marca) chegariam direto à Fila de Aprovação humana, tornando a fonte "Geração com IA" pouco confiável. Este spec existe para que a maioria dos problemas óbvios seja filtrada antes de qualquer humano ver a imagem.

## Stack
- **Framework**: NestJS, consumidor de fila BullMQ (Redis) — processa os jobs publicados pelo spec `017`.
- **Modelo de avaliação**: Claude com visão (Anthropic API), reusando `AnthropicService` do spec `017`.
- **Variáveis de ambiente necessárias**: `ANTHROPIC_API_KEY` (já configurada), `IMAGE_QA_THRESHOLD` (default `6.0`, escala 0-10).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `017-motor-geracao-imagem-ia`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/image-generation/qa-vision.processor.ts` — BullMQ worker que consome a fila publicada pelo spec `017`.
- `apps/api/src/modules/image-generation/qa-vision.service.ts` — monta o prompt de avaliação e chama Claude com a imagem anexada (`image` content block da API Anthropic).
- `apps/api/src/modules/image-generation/dto/qa-result.dto.ts`.

### Lógica principal
1. Worker recebe `{ imageGenerationJobId }`.
2. Busca o job, a imagem resultante (`result_image_url`) e o `brand_kit` (paleta, referência) do workspace.
3. Monta um prompt de avaliação para Claude com visão, pedindo nota 0-10 em três eixos, formato de resposta estruturado (JSON):
   - **`brandFitScore`**: a imagem usa cores/estilo consistentes com a paleta e o tom da marca descritos?
   - **`artifactScore`**: nota alta = poucos artefatos de IA visíveis (mãos/rostos distorcidos, simetria anormal, texto fantasma ilegível, watermark residual); nota baixa = artefatos evidentes.
   - **`negativeSpaceScore`**: a zona reservada para overlay de texto (informada no prompt de avaliação a partir do `slot_map` do template) está visualmente calma o suficiente para texto ficar legível por cima?
4. Grava os 3 scores em `image_generation_jobs`.
5. Decisão:
   - Média dos 3 scores ≥ `IMAGE_QA_THRESHOLD` → `status = 'qa_passed'`, o `content_slide.background_image_url` é atualizado com a imagem aprovada.
   - Média < threshold e `attempt_number < 3` → dispara nova chamada ao spec `017` (`attempt_number + 1`), mesmo `content_slide_id`.
   - Média < threshold e `attempt_number >= 3` (ou seja, já são 2 regenerações além da original) → `status = 'escalated_to_human'`; a peça segue para a Fila de Aprovação (spec `026`) com um badge visual indicando "IA — não passou no QA automático, revisão manual necessária".
6. Independente do resultado do QA, a **regra de segurança do MVP** (PRD 7.7) se aplica: mesmo uma imagem `qa_passed` faz a `content_piece` inteira exigir aprovação humana antes de agendar, se a fonte da imagem for `ai_generated` — isso é enforçado no spec `025` (content-pieces-api), não aqui; este spec só marca o status da imagem em si.

### Schema / Tipos (se aplicável)
```typescript
interface QaVisionResult {
  brandFitScore: number;       // 0-10
  artifactScore: number;       // 0-10
  negativeSpaceScore: number;  // 0-10
  reasoning: string;           // explicação curta, para auditoria/debug
}
```

## Critérios de Aceitação
- [ ] CA-01: Uma imagem gerada com boa aderência de cor/estilo (teste com fixture conhecida) recebe `brandFitScore` alto e é marcada `qa_passed`.
- [ ] CA-02: Uma imagem com score médio abaixo do threshold dispara automaticamente uma nova tentativa de geração (spec `017`), incrementando `attempt_number`.
- [ ] CA-03: Após 3 tentativas sem passar no threshold, o job fica `escalated_to_human` e não dispara mais regenerações automáticas.
- [ ] CA-04: Os 3 scores + `reasoning` ficam salvos em `image_generation_jobs` para toda avaliação, aprovada ou não (auditoria completa).
- [ ] CA-05: `content_slide.background_image_url` só é atualizado quando o status final é `qa_passed` — nunca aponta para uma imagem reprovada.
- [ ] CA-06: Falha na chamada à API da Anthropic (timeout, erro 5xx) não trava o worker indefinidamente — job vai para `status='qa_failed'` com retry limitado (3 tentativas de chamada à API, não de geração de imagem) antes de escalar para humano por segurança.

## Comandos de Validação
```bash
# publicar manualmente um job de teste na fila e observar o processor
pnpm --filter api test qa-vision.service.spec.ts
```

## Notas de Implementação
O `IMAGE_QA_THRESHOLD` default (6.0) é um ponto de partida — a métrica de sucesso do PRD Seção 8 ("Imagens geradas por IA aprovadas no QA automático sem regeneração ≥ 70%") deve guiar o ajuste fino desse valor depois de volume real de uso, não travar a implementação inicial em busca do número perfeito.
