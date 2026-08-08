# 048 Prompts do Sistema API

## Objetivo
Permitir que o Super Admin edite os prompts base usados pela IA em todo o sistema, sem depender de deploy de código, com histórico de versões.

## Contexto
Requisito padrão (skill `padrao-saas-plg`, item 5). Ver PRD módulo 18 e tabelas `system_prompts`/`system_prompt_versions` (Seção 6.3). Os módulos de IA já construídos (`022-geracao-copy-claude`, `023-diretor-de-cena`, `018-qa-visao-imagem-ia`) hoje usam templates de prompt hardcoded no código — este spec os migra para ler do banco.

## Stack
- **Framework**: NestJS, Prisma.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `022-geracao-copy-claude`
- [ ] `023-diretor-de-cena`
- [ ] `018-qa-visao-imagem-ia`
- [ ] `041-painel-mestre-superadmin`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/system-prompts/system-prompts.module.ts`
- `apps/api/src/modules/system-prompts/system-prompts.controller.ts` — `GET /platform/system-prompts`, `GET /platform/system-prompts/:key`, `PUT /platform/system-prompts/:key` (cria nova versão), `GET /platform/system-prompts/:key/versions`, `POST /platform/system-prompts/:key/rollback/:version`.
- `apps/api/src/modules/system-prompts/system-prompts.service.ts` — cache em memória (invalidado a cada `PUT`) para não bater no banco a cada geração de IA.
- `apps/api/prisma/seed-prompts.ts` — popula `system_prompts` com o conteúdo que hoje está hardcoded nos specs `022`/`023`/`018`, como `version=1`, na primeira migration.

### Arquivos a MODIFICAR
- `apps/api/src/modules/copy-generation/prompt-templates.ts` (spec `022`) — passa a buscar o template via `SystemPromptsService.get('copy_generation')` em vez de constante hardcoded.
- `apps/api/src/modules/image-generation/scene-director.service.ts` (spec `023`) — idem, `prompt_key='scene_director'`.
- `apps/api/src/modules/image-generation/qa-vision.service.ts` (spec `018`) — idem, `prompt_key='qa_vision'`.
- `apps/api/src/modules/image-generation/prompt-builder.service.ts` (spec `017`) — as camadas fixas do prompt de imagem (brand identity lock, negative list, slot constraint — PRD 7.7) também viram `system_prompts` editáveis (`prompt_key='image_negative_list'`, etc.), não só copy/cena/QA.

### Lógica principal
1. `PUT /platform/system-prompts/:key`: cria uma nova linha em `system_prompt_versions`, incrementa `system_prompts.current_version`, atualiza `system_prompts.content`. Nunca deleta versões antigas.
2. `POST /platform/system-prompts/:key/rollback/:version`: copia o conteúdo de uma versão antiga como a nova versão atual (rollback é, na prática, uma nova versão idêntica à antiga — preserva histórico linear).
3. Cache em memória na API (TTL curto ou invalidação ativa no `PUT`) evita que toda chamada de geração de copy/imagem bata no Postgres só para buscar o prompt.
4. Só `super_admin` acessa estes endpoints — nunca `workspace_admin`, mesmo que ele pudesse in teoricamente querer customizar (customização por workspace não é escopo deste spec — os prompts são globais, ver Notas).

## Critérios de Aceitação
- [ ] CA-01: Editar o prompt de `copy_generation` via `PUT` e gerar um copy novo (spec `022`) usa o conteúdo atualizado, não o hardcoded original.
- [ ] CA-02: Histórico de versões (`GET /platform/system-prompts/:key/versions`) mostra todas as edições em ordem.
- [ ] CA-03: Rollback para uma versão anterior funciona e reflete na próxima geração de IA.
- [ ] CA-04: `workspace_admin` tentando acessar qualquer rota deste módulo recebe 403.
- [ ] CA-05: Seed inicial popula os 3+ prompts a partir do conteúdo que já existia hardcoded, sem quebrar o comportamento atual no primeiro deploy.

## Comandos de Validação
```bash
curl -s -X PUT https://app.<dominio>/api/v1/platform/system-prompts/copy_generation -H "Authorization: Bearer <token_super_admin>" -d '{"content":"..."}'
curl -s https://app.<dominio>/api/v1/platform/system-prompts/copy_generation/versions -H "Authorization: Bearer <token_super_admin>"
```

## Notas de Implementação
Customização de prompt **por workspace** (em vez de só global) é uma extensão natural pós-MVP, não coberta aqui — se vier a ser necessária, adicionar uma tabela `workspace_prompt_overrides` que, se presente, tem precedência sobre o `system_prompts` global para aquele workspace específico.
