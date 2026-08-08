# 049 Prompts do Sistema Frontend

## Objetivo
Tela onde o Super Admin edita, testa e reverte os prompts base da IA.

## Contexto
Segue o spec `048`. Ver PRD Seção 5.2, página "Prompts do Sistema (Admin)".

## Stack
- **Framework**: Next.js, editor de texto simples (textarea grande ou `@uiw/react-textarea-code-editor` para destaque leve de sintaxe, já que os prompts têm placeholders tipo `{{brand_name}}`).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `048-prompts-sistema-api`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(super-admin)/system-prompts/page.tsx` — lista os prompts existentes (`copy_generation`, `scene_director`, `qa_vision`, `image_negative_list`, etc.).
- `apps/web/app/(super-admin)/system-prompts/[key]/page.tsx` — editor do prompt específico: conteúdo atual, botão "Salvar nova versão", histórico de versões com botão "Reverter para esta", e um botão **"Testar"** que dispara uma geração real de exemplo (reusando o endpoint do módulo correspondente com um input fixo de teste) sem afetar produção, mostrando o resultado antes de confirmar a publicação.
- `apps/web/components/system-prompts/VersionHistoryList.tsx`, `PromptTestPanel.tsx`.

### Lógica principal
1. Botão "Testar" chama o endpoint de geração real (ex: `POST /copy-generation/generate` para o prompt de copy) mas com o conteúdo do **rascunho ainda não salvo** — implica que o backend precisa aceitar um `promptOverride` opcional nesses endpoints de geração, usado só nesse fluxo de teste administrativo (adicionar esse parâmetro opcional nos specs `022`/`023`/`018` se ainda não existir, coordenando com o spec `048`).
2. Salvar só é possível depois de ao menos um "Teste" bem-sucedido no rascunho atual (evita publicar um prompt quebrado sem verificação nenhuma) — soft constraint de UX, não bloqueio rígido de backend.
3. Histórico mostra diff simples (texto antes/depois) entre versões consecutivas, não só o conteúdo bruto de cada uma.

## Critérios de Aceitação
- [ ] CA-01: Editar um prompt, testar, ver o resultado de exemplo, e salvar reflete a nova versão em `GET /platform/system-prompts/:key`.
- [ ] CA-02: Histórico de versões lista todas as edições anteriores com data e quem editou.
- [ ] CA-03: Reverter para uma versão anterior funciona e o prompt "atual" volta a refletir aquele conteúdo.
- [ ] CA-04: Testar um prompt não afeta nenhum dado real de produção (nenhuma `content_piece`/`image_generation_job` é criada pelo teste).

## Comandos de Validação
```bash
pnpm --filter web dev  # validação manual dos CAs acima (lembrando: tudo roda no VPS, não local — ver .specs/shared/como-executar.md)
```

## Notas de Implementação
O parâmetro `promptOverride` nos endpoints de geração (item 1 da Lógica principal) deve ser aceito **só** quando o chamador for `super_admin` autenticado — nunca exposto como parâmetro livre em endpoints usados por workspaces comuns, para não permitir prompt injection arbitrário via API pública.
