# 028 Meta OAuth Bridge

## Objetivo
Permitir que o Admin do Workspace conecte suas contas Instagram/Facebook a partir da nossa própria UI, reaproveitando o fluxo OAuth que o Postiz já implementa internamente, e sincronizar o resultado com a nossa tabela `social_accounts`.

## Contexto
Segue o spec `027` (Postiz configurado com nosso app Meta). Decisão de arquitetura importante: **não reimplementamos OAuth do zero** — o Postiz já faz a troca de código por token, renovação e armazenamento de credenciais de forma madura. Este spec constrói uma "ponte fina": nossa API dispara/redireciona para o fluxo de conexão do Postiz e, ao concluir, consulta a API do Postiz para saber qual conta foi conectada, gravando uma referência em `social_accounts` (nossa tabela, usada pelo resto do produto — ver PRD Seção 6.2).

## Stack
- **Framework**: NestJS, cliente HTTP para a API do Postiz.
- **Variáveis de ambiente necessárias**: `POSTIZ_API_URL`, `POSTIZ_API_KEY`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `027-postiz-selfhosted-deploy`
- [ ] `007-multitenant-middleware`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/social-accounts/social-accounts.module.ts`
- `apps/api/src/modules/social-accounts/social-accounts.controller.ts` — `GET /social-accounts` (lista contas conectadas do workspace), `POST /social-accounts/connect/meta` (retorna a URL de conexão do Postiz para o frontend redirecionar/abrir popup), `POST /social-accounts/sync` (webhook ou polling — chamado após o retorno do OAuth para buscar a conta recém-conectada no Postiz e persistir em `social_accounts`), `DELETE /social-accounts/:id` (desconecta).
- `apps/api/src/modules/social-accounts/postiz-client.service.ts` — cliente HTTP tipado para a API do Postiz (criar conta integrada por workspace do Postiz — **nota de mapeamento**: cada workspace nosso deve corresponder a uma "organização"/"team" separada dentro do Postiz, se o Postiz suportar multi-tenancy nativamente; se não suportar, usar uma convenção de nomenclatura de conta prefixada por `workspace_id` dentro de uma única organização Postiz — decidir com base no que a validação do spec `027` revelar sobre as capacidades reais do Postiz).
- `apps/api/src/modules/social-accounts/dto/connect-account.dto.ts`.

### Lógica principal
1. `POST /social-accounts/connect/meta`: nossa API pede ao Postiz (via `postiz-client.service.ts`) a URL de início do fluxo OAuth Meta para o "espaço" daquele workspace no Postiz; retorna essa URL para o frontend abrir (popup ou redirect).
2. Usuário completa o OAuth na tela do próprio Postiz (Meta autentica e redireciona de volta para o domínio do Postiz, não o nosso).
3. `POST /social-accounts/sync`: nossa API consulta `GET` na API do Postiz por contas conectadas daquele workspace, compara com o que já existe em `social_accounts`, insere as novas com `network` (`instagram`/`facebook`), `external_account_id` (id da conta no Postiz, usado depois pelo spec `030` para disparar publicações), `status='connected'`. **Não armazenamos o token OAuth em si** (ele já fica seguro dentro do Postiz) — nossa tabela `social_accounts.access_token_encrypted` passa a guardar, em vez do token real, a referência interna do Postiz (ajuste de uso do campo em relação ao PRD original, documentar essa decisão: o campo existe no schema mas seu conteúdo é "referência ao Postiz", não o token bruto — evita duplicar a superfície de risco de segurança em dois lugares).
4. `DELETE /social-accounts/:id`: desconecta tanto no Postiz (via API) quanto marca `status='revoked'` localmente.
5. Detecção de token expirado: um job periódico (BullMQ, rodando a cada 1h) consulta o status de cada conta no Postiz e atualiza `social_accounts.status` para `'expired'` quando o Postiz reportar isso, permitindo à UI (spec `031`) mostrar o alerta de reconexão sem derrubar as demais contas do workspace.

## Critérios de Aceitação
- [ ] CA-01: `POST /social-accounts/connect/meta` retorna uma URL válida de início de OAuth do Postiz.
- [ ] CA-02: Após completar o OAuth manualmente (teste com conta real de Instagram Business de teste) e chamar `POST /social-accounts/sync`, a conta aparece em `GET /social-accounts` com `status='connected'`.
- [ ] CA-03: Nenhum token OAuth bruto (access/refresh token reais da Meta) é armazenado na nossa tabela `social_accounts` — só a referência interna do Postiz.
- [ ] CA-04: `DELETE /social-accounts/:id` remove a conexão tanto no Postiz quanto localmente; tentar publicar depois nessa conta falha de forma previsível (não trava o sistema).
- [ ] CA-05: Expirar manualmente uma conexão no Postiz (revogando o token pelo lado da Meta, se possível em teste, ou simulando) e rodar o job de verificação atualiza `status='expired'` sem afetar outras contas do mesmo workspace.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/social-accounts/connect/meta -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
curl -s http://localhost:3333/api/v1/social-accounts -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
```

## Notas de Implementação
Este spec depende de decisões que só ficam claras depois do spec `027` validar as capacidades reais do Postiz (multi-tenancy nativo ou não). Se o Postiz não suportar isolamento por workspace nativamente, pode ser necessário provisionar uma "organização" Postiz por workspace nosso via API na hora do `009-workspace-provisioning` — se for o caso, voltar e adicionar essa chamada lá também (nota cruzada entre specs, aceitável quando uma spec revela uma dependência nova durante a execução).
