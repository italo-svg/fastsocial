# n8n — Decisão: Reuso da Instância Existente

## Desvio consciente do spec 032

O spec `032` originalmente pedia para subir n8n via `docker-compose.yml`
próprio (banco Postgres dedicado, volume próprio). O n8n **já existe** neste
mesmo VPS (`N8N.volupia` — o próprio hostname do servidor vem daí), em uso
pela agência antes do FastSocial existir. Seguindo exatamente a mesma decisão
e o mesmo racional já registrados em `infra/postiz/README.md` para o spec
`027` (e antecipados pelo próprio `.specs/shared/como-executar.md`: "os specs
027 e 032 devem ser executados em modo 'conectar ao existente'"), este spec
reusa a instância existente em vez de subir uma nova.

## Infraestrutura existente (não criada por este spec)

| Serviço | Container (Swarm) | Imagem | Rede | Banco |
|---|---|---|---|---|
| n8n | `volupia_n8n` | `n8nio/n8n:1.83.2` | `easypanel` (mesma rede de `fastsocial-api-prod`) | SQLite interno ao volume do container (não há Postgres dedicado — configuração default do n8n) |

URL pública (UI): `https://volupia-n8n.bqvgyf.easypanel.host`. Confirmado
rodando (não foi reiniciado nem alterado por esta sessão) — CA-01 (n8n sobe
sem erro, acessível) e CA-05 (reiniciar preserva workflows, já que o volume é
gerenciado pelo Easypanel/Swarm de forma independente deste projeto) já estão
satisfeitos pela instância existente.

## Por que não geramos a N8N_API_KEY nós mesmos (diferente do Postiz)

No spec `027`, o usuário autorizou explicitamente gerar a API key do Postiz
via escrita direta no banco Postgres dele ("vc tem acesso ao meu postiz é só
gerar vc") — seguro porque o Postiz guarda a `apiKey` em **texto plano** numa
tabela `Organization`, e criar uma nova Organization é uma operação aditiva
isolada que não toca nada existente.

O n8n é estruturalmente diferente e mais arriscado de mexer por fora:
1. **Banco SQLite, não Postgres.** É um único arquivo, sem suporte real a
   escrita concorrente segura enquanto o processo está rodando — diferente de
   abrir uma nova conexão Postgres. Editar esse arquivo por fora enquanto o
   n8n está servindo os workflows reais da agência é um risco de corrupção
   que não existia no caso do Postiz.
2. **API keys do n8n não ficam em texto plano** — mesmo que estivessem, mexer
   na tabela de usuário/credenciais de uma instância em uso ativo por outros
   fluxos de trabalho da agência (não isolado como criar uma Organization
   nova) tem uma chance maior de efeito colateral indesejado.

Por isso, `N8N_API_KEY` fica como pendência para o usuário gerar pela própria
UI do n8n (Configurações → n8n API → Create an API key) — mesmo padrão de
degradação graciosa usado no resto do projeto para credenciais que só o dono
da conta consegue/deve gerar (specs 016/017/018/021/022, e o item já listado
em `.prd/checklist_acessos_e_delegacao.md`).

**Importante:** `N8N_API_KEY` só é necessária para a nossa API controlar o
n8n programaticamente (ativar/desativar workflow ao ligar/desligar o
autopilot — specs `036`/`037`). Nenhum dos 5 CAs deste spec `032` depende
dela — todos giram em torno do caminho inverso (n8n → nossa API), que usa o
`N8N_SERVICE_TOKEN`, gerado e controlado inteiramente por nós (ver abaixo).

## N8N_SERVICE_TOKEN — autenticação de serviço (implementado e validado)

Diferente da API key do n8n, o `N8N_SERVICE_TOKEN` é um segredo **nosso**
(não depende de nada dentro do n8n) usado pelos workflows para chamar de
volta a nossa API. Implementado em
`apps/api/src/auth/strategies/service-token.strategy.ts` +
`apps/api/src/auth/guards/service-token.guard.ts` como um guard simples
(`CanActivate`, mesmo padrão de `WorkspaceGuard`/`RolesGuard` já usado no
projeto — não uma Passport strategy: `passport-custom` foi tentado primeiro,
mas bundla tipos de `@types/express` incompatíveis com a versão do projeto,
erro de build real). Comparação em tempo constante (`crypto.timingSafeEqual`)
contra o header `Authorization: Bearer <token>`.

Validado ao vivo (ver `.specs/EXECUTAR-SPECS.md`, nota do Task 032) contra
`GET /api/v1/auth/service-ping`, endpoint de diagnóstico criado no mesmo
espírito do `GET /api/v1/auth/me/workspace-context` do spec `007`.

## Como criar um workflow de teste (CA-02) quando a N8N_API_KEY existir

1. Acessar `https://volupia-n8n.bqvgyf.easypanel.host` com o login existente
   da agência.
2. Configurações → n8n API → Create an API key → colar em `N8N_API_KEY`.
3. Criar um workflow: nó Webhook → nó HTTP Request apontando para
   `http://fastsocial-api-prod:3333/api/v1/health` (mesma rede `easypanel`,
   sem precisar do domínio público) → nó HTTP Request para
   `http://fastsocial-api-prod:3333/api/v1/auth/service-ping` com header
   `Authorization: Bearer <N8N_SERVICE_TOKEN>`.
4. Isso finaliza a validação manual de CA-02 que não pôde ser automatizada
   nesta sessão sem login pessoal no n8n.

## Workflow de Pesquisa Recorrente (spec 033)

`infra/n8n-workflows/research-pipeline.json` — workflow versionado com:
Cron diário (06:00) → `GET /internal/autopilot/active-workspaces` → loop
(Split In Batches) → `POST /internal/autopilot/research-scan` por workspace
(com `continueOnFail: true`, para CA-05: falha num workspace não trava os
demais) → Wait de 3s entre workspaces → volta pro loop.

A URL da API está **hardcoded** como `http://fastsocial-api-prod:3333`
(nome do container real desta fase ad-hoc pré-spec-043 — ver
`infra/DEPLOYMENT-ATUAL.md`) em vez de usar `$env.FASTSOCIAL_API_URL`, para
não precisar adicionar uma env var nova no container do n8n e reiniciá-lo —
reiniciar um serviço compartilhado que já está em uso ativo pela agência
para outros workflows é uma ação com efeito colateral maior do que subir um
container novo, e não era necessária aqui. Se o nome do container mudar no
spec `043`, atualizar a URL neste JSON.

Os dois nós HTTP Request referenciam uma credencial nomeada
`FastSocial Service Token` (tipo "Header Auth", header `Authorization`,
valor `Bearer <N8N_SERVICE_TOKEN>`) — precisa ser criada uma vez dentro do
n8n antes de importar o workflow (Credentials → New → Header Auth).

### Como importar (quando a N8N_API_KEY existir)

1. Acessar `https://volupia-n8n.bqvgyf.easypanel.host` com o login existente
   da agência.
2. Credentials → New → "Header Auth" → nome `FastSocial Service Token`,
   header `Authorization`, valor `Bearer <N8N_SERVICE_TOKEN real>`.
3. Import from File → `infra/n8n-workflows/research-pipeline.json`.
4. Vincular a credencial criada no passo 2 aos dois nós HTTP Request (o
   import não traz o valor da credencial, só a referência).
5. Ativar o workflow (toggle "Active").
6. CA-01/CA-04 (execução manual e agendada de verdade) ficam pendentes deste
   passo manual — CA-02/CA-03/CA-05 (a lógica dos endpoints em si) já estão
   implementados e validados via `curl` direto contra a API, ver
   `.specs/EXECUTAR-SPECS.md`.

## Pendências

- [ ] `N8N_API_KEY` — gerada pelo usuário na própria conta do n8n já em uso
  (Configurações → n8n API), pelos motivos de segurança explicados acima.
- [ ] Importar `infra/n8n-workflows/research-pipeline.json` manualmente (não
  pôde ser automatizado sem a `N8N_API_KEY` acima) — passo a passo na seção
  anterior.
