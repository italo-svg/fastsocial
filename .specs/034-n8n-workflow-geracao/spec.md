# 034 n8n Workflow — Geração Automática (Copy + Composição)

## Objetivo
Criar o workflow n8n que, para cada insight selecionado, gera copy, gera/seleciona a imagem de fundo, e compõe a peça final automaticamente.

## Contexto
Segundo dos 3 workflows do piloto automático. Segue o spec `033` (que já populou `research_insights` novos) e os specs `022` (copy), `016`/`017`/`018` (fontes de imagem), `025` (content-pieces). Ver PRD Seção 3 "Ciclo do Piloto Automático", passos 3-6.

## Stack
- **n8n**: workflow JSON versionado.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `033-n8n-workflow-pesquisa`
- [ ] `022-geracao-copy-claude`
- [ ] `025-content-pieces-api`
- [ ] `017-motor-geracao-imagem-ia` / `018-qa-visao-imagem-ia` (quando `default_image_source='ai_generated'`)

## O que implementar

### Arquivos a CRIAR
- `infra/n8n-workflows/content-generation-pipeline.json`.
- `apps/api/src/modules/autopilot/autopilot-internal.controller.ts` — **modificar** (criado no spec `033`) para adicionar `GET /internal/autopilot/:workspaceId/next-insights` (retorna insights não consumidos, ordenados por relevância, respeitando quantos posts ainda faltam na cadência semanal daquele workspace — cálculo: `autopilot_pipelines.posts_per_week` menos quantos já foram gerados nos últimos 7 dias).

### Lógica principal (nós do workflow, por workspace processado)
1. **HTTP Request** → `GET /internal/autopilot/:workspaceId/next-insights` — quantos insights processar nesta rodada (respeitando a cadência).
2. **Split In Batches** — um por insight selecionado.
3. **HTTP Request** → decide o `format` (`static_post`/`carousel`) com base em `autopilot_pipelines.format_mix` (lógica de sorteio ponderado pode viver num nó **Code** do próprio n8n, simples o suficiente para não precisar de endpoint dedicado) e o `suggested_format` do insight como sinal adicional.
4. **HTTP Request** → `POST /copy-generation/generate` com o `insightId` e o `format` decidido.
5. **HTTP Request** → `POST /content-pieces` criando a peça com o copy retornado + um template escolhido (lógica de escolha: template de sistema compatível com o `format`, ou o mais usado/melhor avaliado do workspace — MVP: seleção aleatória entre os compatíveis, documentar como possível melhoria futura).
6. **Condicional** (`IF` node): se `brand_kit.default_image_source == 'ai_generated'` → `HTTP Request` para `POST /image-generation/jobs` por slide, com **Wait** em loop de polling até `status` sair de `pending` (respeitando o fluxo de QA do spec `018`, incluindo possíveis regenerações automáticas que já acontecem dentro da API, não no workflow); senão → segue direto usando banco de imagens/biblioteca conforme configurado.
7. **HTTP Request** → `POST /content-pieces/:id/render`.
8. **HTTP Request** → `POST /content-pieces/:id/submit-for-approval` com `autoApprove = !autopilot_pipelines.requires_approval` no corpo (a API aplica a regra de segurança do spec `025` de qualquer forma quando há imagem de IA envolvida, independente deste valor).

## Critérios de Aceitação
- [ ] CA-01: Execução manual do workflow para um workspace de teste com `default_image_source='own_library'` produz uma `content_piece` renderizada e corretamente submetida (aprovação ou aprovada, conforme config).
- [ ] CA-02: O mesmo teste com `default_image_source='ai_generated'` aguarda corretamente o job de geração+QA antes de renderizar, e a peça resultante **sempre** vai para `pending_approval`, mesmo com `requires_approval=false` no pipeline (reforça a regra de segurança do spec `025` também no caminho automático).
- [ ] CA-03: A cadência semanal é respeitada — rodar o workflow mais vezes que `posts_per_week` no mesmo período de 7 dias não gera posts além do limite configurado.
- [ ] CA-04: `format_mix` é respeitado estatisticamente ao longo de várias execuções (não precisa ser exato a cada rodada, mas a proporção geral deve convergir para o configurado).
- [ ] CA-05: Falha em um insight específico (ex: geração de copy falha) não interrompe o processamento dos demais insights da rodada.

## Comandos de Validação
```bash
curl -s "http://localhost:3333/api/v1/internal/autopilot/<workspace-id>/next-insights" -H "Authorization: Bearer $N8N_SERVICE_TOKEN"
# validar execução manual do workflow pela UI do n8n
```

## Notas de Implementação
Este é o workflow mais longo e com mais pontos de espera (polling de geração de imagem) — configurar timeouts generosos nos nós HTTP do n8n (a geração de imagem + QA pode levar 30-90s realisticamente) para não abortar prematuramente.
