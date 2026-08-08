# 027 Postiz Self-hosted Deploy

## Objetivo
Subir o Postiz (self-hosted, open source) via Docker Compose, configurado com nossos próprios apps OAuth de Meta e LinkedIn, para servir como núcleo de agendamento/publicação.

## Contexto
Decisão de arquitetura do PRD (Seção 7.2): reaproveitar o Postiz em vez de reimplementar OAuth/agendamento/publicação do zero. Este spec sobe o Postiz e o deixa pronto para uso — a integração da nossa API com ele é dos specs `028`/`029` (conexão de contas) e `030` (bridge de agendamento/publicação).

⚠️ **Pré-requisito de validação antes de codar**: confirmar na documentação atual do Postiz (repositório oficial) (1) se ele suporta LinkedIn nativamente e, se sim, (2) se o tipo de post "documento/PDF" (necessário para carrossel do LinkedIn, ver PRD módulo 8) é suportado pelo conector LinkedIn do Postiz ou não. Se não for suportado, este spec deve marcar isso como gap conhecido e o spec `029` implementa a postagem de documento do LinkedIn via chamada direta à LinkedIn API, sem passar pelo Postiz.

## Stack
- **Postiz**: imagem Docker oficial do projeto (verificar tag estável mais recente no momento da execução).
- **Variáveis de ambiente necessárias**: `META_APP_ID`, `META_APP_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `POSTIZ_API_KEY` (gerada por nós, usada pela nossa API para autenticar chamadas ao Postiz), `POSTIZ_DATABASE_URL` (banco Postgres **separado** do banco do produto — o Postiz gerencia seu próprio schema).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `002-setup-docker-compose` — precisa da rede Docker e do Postgres base já existirem (o Postiz pode rodar num banco próprio no mesmo Postgres server, schema separado, ou um Postgres dedicado — decisão: **schema/banco `postiz` dedicado dentro da mesma instância Postgres**, mais simples de operar num único VPS).

## O que implementar

### Arquivos a CRIAR
- `infra/postiz/docker-compose.yml` — serviço(s) do Postiz (web + worker, conforme a arquitetura oficial do projeto), ligado à rede `autocontent_net` já criada no spec `002`.
- `infra/postiz/README.md` — passo a passo de configuração inicial: criar o app Meta e o app LinkedIn nos respectivos portais (linkar para o checklist em `.prd/checklist_acessos_e_delegacao.md`), configurar as URLs de callback OAuth apontando para o domínio do Postiz (`postiz.<dominio-interno>`), gerar a API key interna do Postiz para uso da nossa API.
- `infra/traefik/dynamic.yml` — **modificar** (criado no spec `002`) para rotear `postiz.<dominio>` até o serviço Postiz.

### Lógica principal
1. Subir o Postiz apontando para um banco Postgres próprio (dentro da mesma instância, schema `postiz`).
2. Configurar as credenciais OAuth do Postiz para usar **nosso** App ID/Secret da Meta e do LinkedIn (não os apps de exemplo/demo do Postiz) — isso é o que garante que o fluxo de conexão de contas dos nossos clientes passa pela nossa identidade de desenvolvedor, essencial para o modelo white-label.
3. Gerar e documentar a API key que a nossa API (spec `030`) vai usar para autenticar chamadas HTTP ao Postiz.
4. Validar manualmente (fora de código, só uma vez nesta spec) que a UI própria do Postiz sobe e permite conectar uma conta de teste do Instagram/Facebook/LinkedIn com sucesso — isso confirma que a configuração OAuth está correta antes de construir qualquer coisa por cima.

## Critérios de Aceitação
- [ ] CA-01: `docker compose -f infra/postiz/docker-compose.yml up -d` sobe o Postiz sem erro, acessível em `postiz.<dominio-interno>` (ou `localhost:5000` em dev).
- [ ] CA-02: O Postiz consegue se conectar ao banco Postgres dedicado (`postiz` schema/database) e roda suas próprias migrations internas com sucesso.
- [ ] CA-03: Com `META_APP_ID`/`SECRET` reais configurados, é possível conectar uma conta de teste do Instagram Business pela própria UI do Postiz.
- [ ] CA-04: Com `LINKEDIN_CLIENT_ID`/`SECRET` reais configurados, é possível conectar uma Company Page de teste pela própria UI do Postiz.
- [ ] CA-05: A API key interna do Postiz autentica chamadas de teste feitas via `curl` diretamente à API REST do Postiz (validação manual antes do spec `030` construir o bridge).
- [ ] CA-06: Documentado no README se o Postiz suporta post de documento/PDF para LinkedIn ou não (resultado da validação de pré-requisito acima).

## Comandos de Validação
```bash
docker compose -f infra/postiz/docker-compose.yml up -d
curl -s http://localhost:5000/api/health
curl -s http://localhost:5000/api/<endpoint-de-teste> -H "Authorization: Bearer $POSTIZ_API_KEY"
```

## Notas de Implementação
Sem `META_APP_ID`/`LINKEDIN_CLIENT_ID` reais (conforme checklist de acessos), este spec ainda pode ser completado até o CA-02 — os CAs 03-06 ficam bloqueados até as credenciais chegarem, e devem ser marcados como "pendente de credencial" em vez de "falhou", conforme o padrão de degradação graciosa do projeto.
