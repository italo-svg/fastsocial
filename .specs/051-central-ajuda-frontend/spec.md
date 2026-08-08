# 051 Central de Ajuda Frontend (KB + Changelog + Tutorial)

## Objetivo
Implementar a central de ajuda pública (base de conhecimento + changelog) e o tutorial/onboarding guiado dentro do produto.

## Contexto
Segue o spec `050`. Ver PRD módulo 16 e páginas "Central de Ajuda", "Changelog" e "Gestão de Conteúdo da Central de Ajuda" (Seção 5.2). O tutorial guiado é a peça que vive dentro do produto (não é uma página separada, é uma camada de overlay/checklist sobre o Dashboard).

## Stack
- **Framework**: Next.js. Tutorial guiado via biblioteca de product tour (ex: `react-joyride` ou implementação própria simples de spotlight + tooltip).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `050-central-ajuda-api`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(public)/help/page.tsx` — busca + lista de categorias.
- `apps/web/app/(public)/help/[slug]/page.tsx` — artigo individual (markdown renderizado).
- `apps/web/app/(public)/changelog/page.tsx` — lista cronológica com tags coloridas por tipo.
- `apps/web/app/(super-admin)/help-center/page.tsx` — lista de artigos/changelog com ações de criar/editar/despublicar.
- `apps/web/app/(super-admin)/help-center/articles/[id]/edit/page.tsx` e `.../changelog/[id]/edit/page.tsx` — editores (markdown com preview lado a lado).
- `apps/web/components/onboarding-tour/ProductTour.tsx` — tour guiado disparado no primeiro login pós-onboarding de marca (spec `011`), com passos apontando para: Acervo de Templates, Pesquisa & Tendências, Editor de Conteúdo, Piloto Automático, Central de Ajuda.
- `apps/web/components/onboarding-tour/OnboardingChecklist.tsx` — checklist persistente no Dashboard ("conecte uma rede social", "configure o piloto automático", "publique seu primeiro post") com progresso salvo por workspace (reusa/estende `workspace` settings ou uma tabela simples `workspace_onboarding_progress` se necessário — adicionar via migration leve).

### Lógica principal
1. Tour guiado dispara uma única vez (flag `has_seen_product_tour` no `workspace` ou em `localStorage` do usuário — decisão: salvar no backend por workspace, para persistir entre dispositivos/membros que acessam depois).
2. Checklist de onboarding marca cada item como concluído automaticamente com base em eventos reais do sistema (ex: existe ≥1 `social_accounts` conectada → item "conecte uma rede social" concluído), não por confirmação manual do usuário.
3. Editor de artigo (admin) usa markdown com preview — mesma lib em ambos os lados (editor e renderização pública) para consistência visual.
4. Busca da central de ajuda é client-side sobre os resultados já paginados da API (busca simples, sem necessidade de debounce complexo dado o volume baixo esperado).

## Critérios de Aceitação
- [ ] CA-01: Artigo publicado é visível e buscável em `/help`; artigo não publicado não aparece.
- [ ] CA-02: Changelog público mostra entradas publicadas, ordenadas por data, com tag visual correta.
- [ ] CA-03: Tour guiado aparece no primeiro acesso pós-onboarding e não reaparece em acessos subsequentes.
- [ ] CA-04: Checklist de onboarding reflete automaticamente o progresso real (ex: conectar uma conta social marca o item correspondente sem ação manual).
- [ ] CA-05: Admin consegue criar, editar e despublicar artigos/changelog pela UI, refletido imediatamente nas páginas públicas.

## Comandos de Validação
```bash
pnpm --filter web dev
```

## Notas de Implementação
Nenhuma.
