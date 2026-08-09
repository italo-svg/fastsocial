# Postiz — Decisão: Reuso da Instância Existente

## Desvio consciente do spec 027

O spec `027` originalmente pedia para subir uma **nova** instância do Postiz
(containers próprios, banco Postgres próprio, subdomínio próprio) dedicada ao
FastSocial. Durante a execução, o usuário decidiu explicitamente **reusar a
instância do Postiz que já roda neste mesmo VPS (`N8N.volupia`) para uso da
própria agência**, em vez de subir uma segunda instância.

**Trade-off aceito conscientemente:** isso mistura o uso pessoal da agência com
o produto FastSocial no mesmo Postiz — o isolamento multi-tenant/white-label
completo (cada cliente com sua própria conexão OAuth isolada) fica mais
limitado do que teria com uma instância dedicada. Reavaliar se o modelo de
negócio white-label exigir isolamento mais forte por cliente/revenda.

## Infraestrutura existente (não criada por este spec)

| Serviço | Container (Swarm) | Imagem | Rede |
|---|---|---|---|
| Postiz app | `volupia_postiz` | `ghcr.io/gitroomhq/postiz-app:v2.11.3` | `easypanel`, `easypanel-volupia` |
| Postiz DB | `volupia_postiz-db` | `postgres:17` | (própria, isolada do produto) |
| Postiz Redis | `volupia_postiz-redis` | `redis:7` | (própria) |

Confirmado rodando de forma saudável há 24h+ no momento da validação (2026-08-09) —
CA-01/CA-02 do spec 027 (Postiz sobe sem erro, conecta ao próprio Postgres) já
estão satisfeitos pela instância existente, sem nenhuma ação nossa.

## Conectividade interna (para o bridge do spec 030)

O container `volupia_postiz` está na rede Docker `easypanel` — a **mesma** rede
onde `fastsocial-api-prod` já roda. Isso significa que a API do FastSocial
consegue chamar o Postiz diretamente por nome de serviço, sem nenhuma
configuração de rede adicional:

- URL interna: `http://volupia_postiz:5000` (nginx interno do Postiz, porta
  confirmada via `netstat` dentro do container — repassa para o backend
  Node na porta 3000 e o frontend Next.js na porta 4200).
- URL pública (UI): `https://volupia-postiz.bqvgyf.easypanel.host`.

## Pendências (bloqueiam CA-03/CA-04/CA-05)

Estas credenciais são as **mesmas** já listadas em
`.prd/checklist_acessos_e_delegacao.md` — a diferença é que, com a decisão de
reuso, elas são configuradas **dentro da instância existente do Postiz**
(pela própria UI dele, em Configurações de Integração), não como env vars
novas do FastSocial:

- [ ] **App da Meta** (Instagram + Facebook) com App ID/Secret reais, configurado
  no Postiz existente.
- [ ] **App do LinkedIn** (Client ID/Secret reais), configurado no Postiz
  existente.
- [ ] **API key do Postiz** gerada pelo usuário na própria conta (Configurações
  → API) — necessária para o spec `030` (bridge de agendamento/publicação)
  autenticar chamadas programáticas. Não temos como gerar isso por conta
  própria, pois é vinculada ao login pessoal do usuário no Postiz.

Sem essas credenciais, CA-03 (conectar conta de teste do Instagram pela UI),
CA-04 (conectar Company Page de teste do LinkedIn) e CA-05 (autenticar chamada
`curl` com a API key) ficam pendentes — não são um erro, é o mesmo padrão de
degradação graciosa usado no resto do projeto (specs 016/017/018/021/022).

## CA-06 — Suporte do Postiz a documento/PDF do LinkedIn (pesquisado, sem depender de credencial)

Pesquisa feita em 2026-08-09 na documentação oficial e no repositório do Postiz:

- **A UI do Postiz suporta** publicar carrossel de documento no LinkedIn: ao
  enviar 2+ imagens para uma LinkedIn Page, o Postiz **converte
  automaticamente essas imagens num PDF** e publica como LinkedIn document
  share (o usuário nunca faz upload de um PDF diretamente pela UI).
- **A API pública do Postiz (`POST /public/v1/posts`) NÃO tem esse suporte
  confirmado** para upload direto de PDF — existe uma issue aberta no
  GitHub oficial pedindo exatamente essa funcionalidade
  ([gitroomhq/postiz-app#1381](https://github.com/gitroomhq/postiz-app/issues/1381),
  aberta em abril de 2026), sugerindo que o fluxo automático de
  imagens→PDF pode não estar disponível (ou não da mesma forma) via API
  programática.

**Decisão para os specs 029/030:** como nosso render-engine (spec `015`) já
gera o PDF pronto via `pdf-lib`, e a API pública do Postiz tem suporte
incerto para receber esse PDF pronto ou para replicar a conversão
automática de imagens→PDF via chamada programática, o spec `029` deve
implementar a publicação de documento do LinkedIn via **chamada direta à
LinkedIn API** (bypassando o Postiz), exatamente como o próprio spec `027`
já previu como contingência ("Notas de Implementação"). Reavaliar quando/se
a issue #1381 for resolvida.

Fontes:
- [LinkedIn Page - Postiz Documentation](https://docs.postiz.com/providers/linkedin-page)
- [Feature Request: Support PDF/document uploads for LinkedIn carousel posts via API · Issue #1381](https://github.com/gitroomhq/postiz-app/issues/1381)
