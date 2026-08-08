# 024 Pesquisa Frontend

## Objetivo
Implementar a tela de Pesquisa & Tendências, onde o usuário vê os insights captados e pode disparar novas pesquisas manualmente.

## Contexto
Segue os specs `020` (API de insights) e `021` (conector de fontes). Ver PRD Seção 5.2, linha "Pesquisa & Tendências".

## Stack
- **Framework**: Next.js, TanStack Query.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `020-pesquisa-tendencias-api`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/research/page.tsx` — grid de cards de insight.
- `apps/web/components/research/InsightCard.tsx` — card com score de relevância (barra visual), badge de origem (`competitor`/`hashtag_trend`/`topic_trend`/`manual`), botão "Usar este insight" (navega para `/content/new?insightId=<id>`, consumido pelo spec `019`).
- `apps/web/components/research/ScanButton.tsx` — botão "Pesquisar agora", chama `POST /research-insights/scan`, mostra estado de carregamento e, ao concluir (poll simples a cada 5s por até 60s), atualiza a lista.
- `apps/web/hooks/useResearchInsights.ts`.

### Lógica principal
1. Lista ordenada por relevância (já vem ordenada da API), com filtro por origem e busca textual simples no `summary` (client-side, sem endpoint dedicado no MVP).
2. Estado vazio (nenhum insight ainda) mostra CTA proeminente "Pesquisar agora" com explicação curta do que a pesquisa faz.
3. Insights já `consumed=true` aparecem visualmente esmaecidos/marcados, mas não escondidos (usuário pode querer reusar um tema).
4. `ScanButton` desabilitado com tooltip explicativo se o brand kit ainda não tiver `niche`/`competitors` preenchidos (espelha a validação do spec `020` CA-02).

## Critérios de Aceitação
- [ ] CA-01: Lista de insights carrega e ordena corretamente por relevância.
- [ ] CA-02: Clicar em "Pesquisar agora" com brand kit incompleto mostra o botão desabilitado com explicação, em vez de deixar o usuário tomar um erro 400 sem contexto.
- [ ] CA-03: Após disparar uma pesquisa, a lista se atualiza automaticamente quando novos insights chegam (dentro da janela de polling).
- [ ] CA-04: Clicar "Usar este insight" navega corretamente para o editor de conteúdo com o insight pré-selecionado.

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: validar os CAs acima no navegador
```

## Notas de Implementação
Sem nenhuma fonte de pesquisa configurada (spec `021` sem credenciais), a tela deve deixar isso claro (ex: banner "Nenhuma fonte de pesquisa automática configurada ainda — você pode criar insights manualmente") em vez de parecer quebrada.
