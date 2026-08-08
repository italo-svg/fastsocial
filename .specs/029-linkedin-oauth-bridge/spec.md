# 029 LinkedIn OAuth Bridge

## Objetivo
Permitir que o Admin do Workspace conecte uma LinkedIn Company Page, e publicar tanto posts de imagem única quanto carrossel (documento PDF multi-página).

## Contexto
Segue o spec `027` (que deve ter validado se o Postiz suporta LinkedIn nativamente, e se suporta post de documento/PDF). Este spec tem **dois caminhos possíveis**, dependendo do resultado dessa validação:
- **Caminho A (Postiz suporta LinkedIn incluindo documento)**: seguir exatamente o mesmo padrão de bridge fino do spec `028` (Meta), só trocando o provider.
- **Caminho B (Postiz não suporta post de documento no LinkedIn)**: implementar a conexão OAuth via Postiz normalmente para posts de imagem única (reaproveitando o que der), **mas** implementar a publicação de carrossel-como-PDF via chamada direta à LinkedIn API (`Documents API` / `Posts API` conforme a versão vigente no momento da implementação), com seu próprio armazenamento de token (neste caso sim, criptografado em `social_accounts.access_token_encrypted`, já que não há Postiz de por meio para custodiar).

Implemente detectando o caminho correto na hora (checar o README gerado pelo spec `027`) e documente claramente qual caminho foi seguido.

## Stack
- **Framework**: NestJS.
- **LinkedIn API** (Caminho B): `axios`/`fetch` direto, seguindo o fluxo OAuth 2.0 3-legged padrão do LinkedIn (`https://www.linkedin.com/oauth/v2/authorization` → callback → troca de code por token).
- **Criptografia de token** (Caminho B apenas): usar uma chave de aplicação (`TOKEN_ENCRYPTION_KEY`, AES-256-GCM) para cifrar `access_token`/`refresh_token` antes de persistir.
- **Variáveis de ambiente necessárias**: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `APP_BASE_URL` (para montar a callback URL), `TOKEN_ENCRYPTION_KEY` (Caminho B).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `027-postiz-selfhosted-deploy` — precisa do resultado da validação de suporte a documento/PDF.
- [ ] `007-multitenant-middleware`

## O que implementar

### Arquivos a CRIAR (comuns aos dois caminhos)
- `apps/api/src/modules/social-accounts/linkedin/linkedin-oauth.controller.ts` — `GET /social-accounts/connect/linkedin` (inicia o fluxo), `GET /social-accounts/connect/linkedin/callback`.
- `apps/api/src/modules/social-accounts/linkedin/linkedin-oauth.service.ts`.

### Arquivos a CRIAR (Caminho B apenas — publicação direta)
- `apps/api/src/modules/social-accounts/linkedin/linkedin-publish.service.ts` — `publishImagePost()`, `publishDocumentPost(pdfUrl, slideCount)`.
- `apps/api/src/common/services/token-encryption.service.ts` — AES-256-GCM encrypt/decrypt reutilizável.

### Lógica principal
1. Fluxo OAuth: `GET /social-accounts/connect/linkedin` redireciona para a tela de autorização do LinkedIn com os escopos necessários (`w_organization_social` ou o escopo equivalente vigente para publicação em Company Page); callback troca `code` por `access_token`/`refresh_token`.
2. **Caminho A**: delega a persistência ao Postiz, igual ao spec `028` — `social_accounts.access_token_encrypted` guarda referência ao Postiz.
3. **Caminho B**: persiste os tokens cifrados diretamente em `social_accounts`, com `network='linkedin'`. Implementa renovação de token respeitando a validade documentada pela LinkedIn API (tokens de LinkedIn tipicamente duram 60 dias — implementar job de renovação proativa antes da expiração, similar ao job de verificação do spec `028`).
4. Publicação de documento (carrossel): recebe a `documentUrl` (PDF) gerada pelo render-engine (spec `015`), faz o upload do arquivo para a LinkedIn Assets API, depois cria o post referenciando o asset — seguir exatamente o fluxo de 2 etapas documentado pela LinkedIn API vigente no momento da implementação (registrar upload → enviar binário → criar post).
5. Publicação de imagem única: mesmo padrão de 2 etapas (registrar → upload → post), mais simples que o documento.

## Critérios de Aceitação
- [ ] CA-01: O fluxo de conexão OAuth completa com sucesso com uma LinkedIn Company Page de teste, e a conta aparece em `GET /social-accounts` com `network='linkedin'`.
- [ ] CA-02: Publicar um post de imagem única de teste na Company Page funciona de ponta a ponta (visível na própria página do LinkedIn).
- [ ] CA-03: Publicar um carrossel de teste (PDF de 3 páginas gerado pelo spec `015`) resulta num post de documento visualizável como carrossel na Company Page.
- [ ] CA-04: (Caminho B) Tokens de acesso nunca aparecem em texto plano em nenhum log ou resposta de API — sempre cifrados em repouso.
- [ ] CA-05: (Caminho B) Renovação de token roda automaticamente antes da expiração, sem exigir que o usuário reconecte manualmente dentro da janela de validade normal.
- [ ] CA-06: Documentado claramente no código (comentário no topo de `linkedin-oauth.service.ts`) qual caminho (A ou B) foi implementado e por quê.

## Comandos de Validação
```bash
curl -s http://localhost:3333/api/v1/social-accounts/connect/linkedin -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
```

## Notas de Implementação
Conforme o checklist de acessos (`.prd/checklist_acessos_e_delegacao.md`), a aprovação de acesso de publicação da LinkedIn para apps de terceiros é o item de maior risco de cronograma do projeto. Este spec **pode e deve ser implementado e testado com uma conta de desenvolvedor em modo sandbox/teste** mesmo antes da aprovação final de produção chegar — a LinkedIn permite testar com usuários/páginas designados como "testers" do app antes da revisão completa. Não bloquear o desenvolvimento esperando aprovação total.
