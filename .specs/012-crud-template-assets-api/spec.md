# 012 CRUD Template Assets API

## Objetivo
Expor os endpoints do acervo de templates — tanto os templates de sistema (globais, mantidos pela plataforma) quanto os templates próprios de cada workspace.

## Contexto
Segue os specs `007` (multitenant) e `010` (brand kit, que já criou o `StorageService` reusado aqui). A tabela `template_assets` (spec `003`) guarda `source` (`system|canva_import|gamma_import|upload`), `format` (`static_post|carousel`), `slot_map` (JSON descrevendo zonas de texto/imagem/logo) e `is_system_template`. Ver PRD módulo 4 (Acervo de Templates) e Seção 6.2.

## Stack
- **Framework**: NestJS, Prisma, `StorageService` do spec `010`.
- **Variáveis de ambiente necessárias**: as mesmas de Supabase já configuradas (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), bucket `templates`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `007-multitenant-middleware`
- [ ] `010-crud-brand-kit-api` — reusa o `StorageService`.

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/templates/templates.module.ts`
- `apps/api/src/modules/templates/templates.controller.ts` — `GET /templates` (query params `?source=system|own&format=static_post|carousel`), `GET /templates/:id`, `POST /templates` (cria template do workspace com slot_map já definido — usado pelo importador do spec `013` e pelo editor visual), `PUT /templates/:id`, `DELETE /templates/:id`.
- `apps/api/src/modules/templates/templates.service.ts` — regra: templates com `is_system_template=true` são somente leitura para todos os workspaces (nenhum workspace pode editar/deletar um template de sistema via este controller).
- `apps/api/src/modules/templates/dto/create-template.dto.ts`, `update-template.dto.ts` — valida `format`, `slotMap` (estrutura mínima: array de zonas `{ id, type: 'text'|'image'|'logo', x, y, width, height, ... }`).

### Lógica principal
1. `GET /templates?source=system`: retorna templates globais (sem filtro de workspace — `is_system_template=true` é visível a todos).
2. `GET /templates?source=own`: retorna templates do workspace ativo.
3. `POST /templates`: sempre cria com `workspace_id` = workspace ativo e `is_system_template=false` — um workspace nunca consegue criar template de sistema por esta rota (só um seed/admin interno faz isso, fora do fluxo de produto).
4. `slot_map` validado estruturalmente (schema Zod/class-validator recursivo) mas o conteúdo semântico (se as zonas fazem sentido visualmente) não é validado no backend — isso é responsabilidade do editor visual do frontend (spec `014`) e do render-engine (spec `015`) na hora de efetivamente renderizar.
5. `DELETE /templates/:id`: soft delete (campo `deletedAt`, adicionar via migration se não existir) para não quebrar `content_pieces` históricos que referenciam o template.

## Critérios de Aceitação
- [ ] CA-01: `GET /templates?source=system` retorna os templates de seed (populados no spec `003`) independente do workspace ativo.
- [ ] CA-02: `POST /templates` de um workspace nunca cria com `is_system_template=true`, mesmo se o payload tentar forçar esse campo (backend ignora/sobrescreve).
- [ ] CA-03: Workspace A não consegue ver, editar nem deletar templates do workspace B (`GET/PUT/DELETE /templates/:id` de template alheio retorna 404, não 403 — não revela existência).
- [ ] CA-04: `slot_map` malformado (zona sem `type` ou sem coordenadas) é rejeitado com 400 e mensagem específica de qual campo falhou.
- [ ] CA-05: Deletar um template referenciado por uma `content_piece` existente não quebra a peça histórica (soft delete, `content_pieces.template_id` continua resolvendo).

## Comandos de Validação
```bash
curl -s http://localhost:3333/api/v1/templates?source=system -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
curl -s -X POST http://localhost:3333/api/v1/templates -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"format":"static_post","slotMap":{"zones":[{"id":"bg","type":"image","x":0,"y":0,"width":1080,"height":1080}]}}'
```

## Notas de Implementação
A criação dos templates de sistema em si (o design/conteúdo deles) é trabalho de design, não de código — este spec só garante que a estrutura de dados e os endpoints existem. O seed do spec `003` cria 3-5 templates de sistema com `slot_map` simples o suficiente para testar o pipeline de ponta a ponta.
