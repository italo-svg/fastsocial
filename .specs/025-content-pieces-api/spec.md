# 025 Content Pieces API

## Objetivo
Implementar o CRUD e a máquina de estados de `content_pieces`/`content_slides` — a peça central que amarra copy, template, imagem e status de aprovação, e que orquestra a chamada ao render-engine.

## Contexto
Este spec é o "cola" da Fase 3-5: recebe as saídas dos specs `015` (render-engine), `017`/`018` (imagem IA), `022` (copy) e produz a entidade que a Fila de Aprovação (spec `026`) e o Agendamento (Fase 6) consomem. Ver PRD Seção 6.2 (tabela `content_pieces`, `content_slides`) e a regra de segurança do PRD 7.7 (peças com imagem de IA sempre exigem aprovação humana, independente da configuração geral do pipeline).

## Stack
- **Framework**: NestJS, Prisma.
- **Variáveis de ambiente necessárias**: `RENDER_ENGINE_URL` (endpoint interno do spec `015`).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `015-render-engine-servico`
- [ ] `022-geracao-copy-claude`
- [ ] `018-qa-visao-imagem-ia`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/content-pieces/content-pieces.module.ts`
- `apps/api/src/modules/content-pieces/content-pieces.controller.ts` — `POST /content-pieces` (cria peça em `draft` a partir de insight/briefing + template escolhido), `PATCH /content-pieces/:id` (atualiza copy/template/fonte de imagem enquanto em `draft`), `POST /content-pieces/:id/render` (chama o render-engine e atualiza `content_slides.rendered_image_url`), `POST /content-pieces/:id/submit-for-approval`, `GET /content-pieces?status=`.
- `apps/api/src/modules/content-pieces/content-pieces.service.ts` — máquina de estados.
- `apps/api/src/modules/content-pieces/state-machine.ts` — transições válidas: `draft → pending_approval → approved → scheduled → published`, `pending_approval → rejected`, `approved → scheduled` (feito pelo spec de agendamento), qualquer erro de publicação leva a `failed`.

### Lógica principal
1. `POST /content-pieces`: cria a `content_piece` (`origin='manual'` neste fluxo; `origin='autopilot'` é setado pelo workflow do n8n na Fase 7) + as `content_slides` correspondentes (1 para `static_post`, N para `carousel`, cada uma com `image_source` herdado do brand kit ou escolhido pelo usuário).
2. `POST /content-pieces/:id/render`: monta o payload conforme a interface do spec `015` (busca template, brand kit, copy de cada slide, `background_image_url` de cada slide) e chama `POST {RENDER_ENGINE_URL}/render`; salva as URLs resultantes em `content_slides.rendered_image_url` (e o PDF em um campo correspondente para LinkedIn, adicionar coluna `document_url` na `content_pieces` via migration adicional se necessário).
3. `POST /content-pieces/:id/submit-for-approval`: transição `draft → pending_approval` **sempre** (mesmo que o workspace tenha `requires_approval=false` no piloto automático) quando **qualquer slide da peça** tem `image_source='ai_generated'` — esta é a regra de segurança do PRD 7.7, implementada aqui como enforcement de backend, não apenas de UI. Se nenhum slide usa IA e o contexto de chamada indicar `autoApprove=true` (usado pelo workflow do piloto automático quando `requires_approval=false`), pula direto para `approved`.
4. Endpoints de aprovação em si (`approve`/`reject`) ficam no spec `026` (fila de aprovação), que reusa este `state-machine.ts`.

### Schema / Tipos (se aplicável)
```typescript
type ContentPieceStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'failed';

interface SubmitForApprovalContext {
  autoApprove: boolean; // vindo do autopilot_pipelines.requires_approval, quando origin='autopilot'
}
```

## Critérios de Aceitação
- [ ] CA-01: Criar uma `content_piece` de carrossel com 5 slides cria também as 5 `content_slides` associadas, na ordem correta.
- [ ] CA-02: `POST /content-pieces/:id/render` com todos os slides prontos (copy + imagem de fundo definidos) produz `rendered_image_url` preenchido em cada slide.
- [ ] CA-03: Uma peça com ao menos 1 slide `image_source='ai_generated'` **sempre** vai para `pending_approval` ao submeter, mesmo passando `autoApprove=true` no contexto — este teste é o mais importante do spec, cobre a regra de segurança do PRD 7.7 diretamente.
- [ ] CA-04: Uma peça sem nenhum slide de IA, com `autoApprove=true`, pula direto para `approved`.
- [ ] CA-05: Transição de estado inválida (ex: tentar publicar uma peça ainda em `draft`) é rejeitada com erro claro pela `state-machine.ts`.
- [ ] CA-06: `PATCH /content-pieces/:id` só é permitido enquanto a peça está em `draft` ou `rejected` — tentar editar uma peça `scheduled`/`published` retorna 409.

## Comandos de Validação
```bash
pnpm --filter api test content-pieces state-machine.spec.ts
curl -s -X POST http://localhost:3333/api/v1/content-pieces/<id>/render -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
```

## Notas de Implementação
Este é o segundo spec mais crítico de segurança do projeto depois do `007` (isolamento multi-tenant) — a regra "IA sempre exige aprovação humana" é uma promessa de produto explícita do dono do projeto, não apenas um detalhe técnico. Escrever teste dedicado que tenta burlar essa regra por todos os caminhos possíveis (via `autoApprove=true`, via chamada direta ao endpoint, via origin='autopilot') antes de considerar este spec concluído.
