# 004 Setup NestJS API

## Objetivo
Criar o esqueleto da API NestJS (`apps/api`) com conexão ao banco via Prisma, health check, e a estrutura de módulos que as specs de negócio futuras vão preencher.

## Contexto
Segue os specs `001-setup-monorepo`, `002-setup-docker-compose` e `003-schema-postgres-core`. A API é o backend central do produto — orquestra brand kit, templates, geração de conteúdo, e faz a ponte com Postiz/n8n (ver `.prd/prd_autocontent_os.md`, Seção 7.2 e 7.3). Este spec só cria o esqueleto rodável; nenhuma regra de negócio ainda.

## Stack
- **Framework**: NestJS 10, TypeScript strict.
- **ORM**: `@prisma/client` (schema já existe em `apps/api/prisma/schema.prisma`, gerado pelo spec `003`), conectado ao Postgres do Supabase via `DATABASE_URL` (pooler connection).
- **Validação**: `class-validator` + `class-transformer` (padrão NestJS) — specs futuras podem usar Zod via pipe customizado se preferirem, mas o esqueleto usa o padrão Nest.
- **Variáveis de ambiente necessárias**: `DATABASE_URL`, `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`. Usar `@nestjs/config` com validação de schema (`Joi` ou `zod`) que falha o boot se uma env var obrigatória estiver ausente.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `001-setup-monorepo`
- [ ] `002-setup-docker-compose` — Postgres precisa estar acessível.
- [ ] `003-schema-postgres-core` — Prisma client precisa existir.

## O que implementar

### Arquivos a CRIAR
- `apps/api/package.json`, `apps/api/tsconfig.json` (extends `../../tsconfig.base.json`), `apps/api/nest-cli.json`.
- `apps/api/src/main.ts` — bootstrap, prefixo global `api/v1`, CORS habilitado para `APP_BASE_URL`, `ValidationPipe` global.
- `apps/api/src/app.module.ts` — módulo raiz, importa `ConfigModule.forRoot({ isGlobal: true, validationSchema })` e `PrismaModule`.
- `apps/api/src/prisma/prisma.module.ts` e `prisma.service.ts` — `PrismaService extends PrismaClient implements OnModuleInit/OnModuleDestroy`, conecta/desconecta corretamente.
- `apps/api/src/health/health.controller.ts` — `GET /api/v1/health` retorna `{ status: 'ok', db: boolean }` (faz um `SELECT 1` via Prisma).
- `apps/api/src/config/env.validation.ts` — schema de validação das env vars obrigatórias nesta fase.
- `apps/api/Dockerfile` — multi-stage build para produção.

### Lógica principal
1. Bootstrap padrão do Nest com prefixo global de rota `/api/v1`.
2. `PrismaService` injetável em qualquer módulo futuro via DI do Nest.
3. Endpoint de health check público (sem auth) que valida conexão real com o banco, não só "processo de pé".
4. Estrutura de pastas pronta para os módulos de negócio (`src/modules/`) que as specs seguintes vão popular — criar a pasta vazia com um `.gitkeep` e um comentário no `app.module.ts` indicando onde os módulos futuros serão importados.

## Critérios de Aceitação
- [ ] CA-01: `pnpm --filter api dev` sobe a API em `http://localhost:3333` sem erro.
- [ ] CA-02: `GET /api/v1/health` retorna `200` com `{ status: 'ok', db: true }` quando o Postgres está acessível.
- [ ] CA-03: `GET /api/v1/health` retorna `503` com `db: false` (sem derrubar o processo) quando o Postgres está inacessível — simular parando o container do Postgres.
- [ ] CA-04: Subir a API sem `DATABASE_URL` no `.env` falha o boot com mensagem de erro clara (validação de env funcionando).
- [ ] CA-05: `pnpm --filter api build` gera `dist/` sem erros de TypeScript.

## Comandos de Validação
```bash
pnpm --filter api dev &
curl -s http://localhost:3333/api/v1/health
pnpm --filter api build
```

## Notas de Implementação
Autenticação, multi-tenant e módulos de negócio **não** entram aqui — são os specs `006` em diante. Este spec entrega só o esqueleto rodável e testável.
