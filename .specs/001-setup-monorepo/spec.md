# 001 Setup Monorepo

## Objetivo
Criar a estrutura base do monorepo (workspaces, tooling, configuração compartilhada) para que todas as specs seguintes tenham onde existir.

## Contexto
Este é o primeiro spec do projeto AutoContent OS — uma plataforma white-label de automação de redes sociais (pesquisa → copy → composição visual → agendamento → publicação → analytics), descrita em `.prd/prd_autocontent_os.md`. Nada existe ainda no repositório além de `.prd/` e `.specs/`. Este spec cria apenas o esqueleto — nenhuma lógica de negócio.

## Stack
- **Linguagem**: TypeScript (strict mode) em todo o monorepo.
- **Gerenciador**: pnpm workspaces + Turborepo.
- **Lint/format**: ESLint + Prettier compartilhados via pacote `packages/config`.
- **Variáveis de ambiente necessárias**: nenhuma nesta spec.

## Dependências
Nenhuma — esta é a spec raiz.

## O que implementar

### Arquivos a CRIAR
- `package.json` — raiz, workspaces `["apps/*", "services/*", "packages/*"]`, scripts `dev`, `build`, `test`, `lint` via turbo.
- `pnpm-workspace.yaml` — declaração dos workspaces.
- `turbo.json` — pipeline (`build`, `dev`, `test`, `lint`) com cache configurado.
- `tsconfig.base.json` — config TS compartilhada (strict, target ES2022, module NodeNext).
- `.eslintrc.cjs` e `.prettierrc` — na raiz, herdados pelos pacotes.
- `.gitignore` — node_modules, dist, .env, .turbo, coverage.
- `.env.example` — copiar o conteúdo de `.specs/shared/como-executar.md` (seção "Variáveis de ambiente").
- `packages/config/package.json` — pacote interno com as configs compartilhadas de ts/eslint.
- `apps/.gitkeep`, `services/.gitkeep` — placeholders até specs seguintes criarem os apps reais.
- `README.md` — raiz, breve, apontando para `.prd/prd_autocontent_os.md` e `.specs/shared/como-executar.md`.

### Lógica principal
1. Rodar `pnpm init` na raiz e configurar workspaces.
2. Configurar Turborepo com pipeline mínimo (`build`, `dev`, `lint`, `test`), sem apps reais ainda.
3. Garantir que `pnpm install` funciona sem erro mesmo com `apps/` e `services/` vazios.
4. Criar `tsconfig.base.json` para ser estendido pelos pacotes futuros (`apps/web/tsconfig.json` etc. farão `extends: "../../tsconfig.base.json"`).

## Critérios de Aceitação
- [ ] CA-01: `pnpm install` roda sem erro na raiz do monorepo.
- [ ] CA-02: `pnpm lint` e `pnpm build` executam (mesmo que não haja nada para lintar/buildar ainda) sem falhar.
- [ ] CA-03: `.env.example` contém todas as variáveis listadas em `.specs/shared/como-executar.md`.
- [ ] CA-04: Estrutura de pastas `apps/`, `services/`, `packages/`, `infra/` existe.
- [ ] CA-05: `.gitignore` impede que `.env`, `node_modules` e `dist` sejam versionados.

## Comandos de Validação
```bash
pnpm install
pnpm lint
pnpm build
git status --porcelain | grep -E "\.env$" && echo "FALHA: .env sendo trackeado" || echo "OK"
```

## Notas de Implementação
Não instalar Next.js/NestJS ainda — isso é responsabilidade dos specs `004` e `005`. Este spec só garante que o "chão" do monorepo existe e que `pnpm`/`turbo` funcionam.
