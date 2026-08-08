# 050 Central de Ajuda API

## Objetivo
Expor o CRUD de artigos da base de conhecimento e entradas de changelog, geridos pelo Super Admin e consumidos publicamente.

## Contexto
Requisito padrão (skill `padrao-saas-plg`, item 2). Ver PRD módulo 16 e tabelas `help_articles`/`changelog_entries` (Seção 6.3).

## Stack
- **Framework**: NestJS, Prisma.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `007-multitenant-middleware` (para os endpoints de gestão, restritos a `super_admin`)

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/help-center/help-articles.controller.ts` — `GET /help-articles` (público, só `is_published=true`, com busca textual `?q=`), `GET /help-articles/:slug` (público), `POST/PUT/DELETE /platform/help-articles` (admin).
- `apps/api/src/modules/help-center/changelog.controller.ts` — `GET /changelog` (público, só publicados), `POST/PUT/DELETE /platform/changelog` (admin).
- `apps/api/src/modules/help-center/help-center.service.ts`

### Lógica principal
1. Busca textual em `help_articles`: usar `ILIKE` simples no MVP (`title`/`content_markdown`), sem exigir motor de busca dedicado — volume de artigos inicial é baixo o suficiente.
2. Artigos/changelog não publicados (`is_published=false` / `published_at IS NULL`) nunca aparecem nos endpoints públicos, só nos de admin.
3. `slug` gerado automaticamente a partir do `title` na criação (kebab-case, garantindo unicidade com sufixo numérico se colidir, mesmo padrão do spec `009` para workspace slug).

## Critérios de Aceitação
- [ ] CA-01: `GET /help-articles?q=termo` retorna artigos publicados que contêm o termo no título ou conteúdo.
- [ ] CA-02: Artigo não publicado não aparece em `GET /help-articles` nem em `GET /help-articles/:slug` (404), mas aparece em `GET /platform/help-articles` (admin).
- [ ] CA-03: `POST /platform/help-articles` sem ser `super_admin` retorna 403.
- [ ] CA-04: `GET /changelog` retorna só entradas com `published_at` preenchido, ordenadas por data decrescente.

## Comandos de Validação
```bash
curl -s "https://app.<dominio>/api/v1/help-articles?q=onboarding"
curl -s https://app.<dominio>/api/v1/changelog
```

## Notas de Implementação
Nenhuma.
