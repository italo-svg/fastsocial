# Regras de Nomenclatura — AutoContent OS

## Pastas e arquivos
- Pastas de spec: `NNN-verbo-substantivo` (kebab-case), 3 dígitos.
- Pastas de código: kebab-case (`content-pieces`, `brand-kit`).
- Componentes React: PascalCase (`ApprovalQueueCard.tsx`).
- Hooks: camelCase com prefixo `use` (`useBrandKit.ts`).
- Serviços/módulos NestJS: kebab-case com sufixo do tipo (`brand-kit.service.ts`, `brand-kit.controller.ts`, `brand-kit.module.ts`).

## Banco de dados
- Tabelas: `snake_case`, plural (`content_pieces`, `social_accounts`) — conforme SQL do PRD (`.prd/prd_autocontent_os.md`, Seção 6.2). Não renomear tabelas nos specs; usar exatamente os nomes já definidos lá.
- Colunas: `snake_case`.
- Models Prisma: `PascalCase` singular, mapeados para a tabela via `@@map("nome_snake_case")`.
- Migrations: geradas pelo Prisma (`prisma migrate dev --name descricao_curta`).

## API (NestJS)
- Rotas REST: `/api/v1/<recurso-plural-kebab>` (ex: `/api/v1/content-pieces`).
- DTOs: sufixo `Dto` (`CreateBrandKitDto`).
- Todo endpoint autenticado exige `workspace_id` resolvido pelo middleware multi-tenant (spec `007-multitenant-middleware`) — nunca aceitar `workspace_id` vindo do body/query do cliente.
- **Isolamento multi-tenant é responsabilidade da aplicação, não do banco.** O projeto usa Supabase, mas a API acessa o Postgres via Prisma com uma conexão de aplicação única (não por usuário final) — o RLS por `auth.uid()` do banco **não filtra automaticamente** as queries feitas pela API. Toda query Prisma que lê/escreve uma tabela com `workspace_id` DEVE incluir esse filtro explicitamente na cláusula `where`. RLS no banco continua habilitado como defesa em profundidade, nunca como único mecanismo de isolamento.

## Variáveis de ambiente
- `UPPER_SNAKE_CASE`, agrupadas por serviço (prefixo quando ambíguo: `POSTIZ_API_URL`, `N8N_API_URL`).

## Git
- Branches: `feat/NNN-nome-da-spec`, `fix/descricao-curta`.
- Um commit por critério de aceitação concluído sempre que fizer sentido, mensagem no imperativo.

## Specs (`.specs/`)
- Cada spec é autossuficiente — não referenciar "a spec anterior disse X", e sim repetir o contexto necessário.
- Specs concluídas movem para `.specs/archive/NNN-nome/`.
- Status de execução é rastreado na tabela de `EXECUTAR-SPECS.md`, não em comentários dentro do spec.
