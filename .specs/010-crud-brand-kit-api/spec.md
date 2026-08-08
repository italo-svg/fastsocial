# 010 CRUD Brand Kit API

## Objetivo
Expor os endpoints para criar/ler/atualizar o brand kit de um workspace — a peça central que calibra copy e composição visual de todo o resto do sistema.

## Contexto
Segue os specs `007` (multitenant) e `009` (workspace provisioning). O brand kit é 1-para-1 com o workspace (tabela `brand_kits`, já no schema do spec `003`) e guarda nicho, concorrentes, tom de voz, paleta de cores, tipografia, logo, **fonte de imagem padrão** (`own_library` / `stock_bank` / `ai_generated`) e **imagens de referência fotográfica** (usadas como conditioning na geração de imagem por IA — ver PRD Seção 7.7). Ver PRD módulo 2 (Onboarding de Marca) e Seção 6.2 para os campos exatos.

## Stack
- **Framework**: NestJS, Prisma.
- **Upload de logo/imagens de referência**: **Supabase Storage** (bucket `brand-assets`, já provisionado no spec `003` via `supabase-admin.service.ts`), via `@supabase/supabase-js` (`supabase.storage.from('brand-assets').upload(...)`), autenticado com `SUPABASE_SERVICE_ROLE_KEY` a partir da API (não é upload direto do browser nesta spec — passa pela API para validação de tipo/tamanho antes de subir).
- **Variáveis de ambiente necessárias**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (já configuradas).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `007-multitenant-middleware`
- [ ] `009-workspace-provisioning`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/brand-kit/brand-kit.module.ts`
- `apps/api/src/modules/brand-kit/brand-kit.controller.ts` — `GET /brand-kit`, `PUT /brand-kit` (upsert, já que é 1-para-1 com o workspace ativo do `@CurrentWorkspace()`), `POST /brand-kit/logo` (upload), `POST /brand-kit/reference-images` (upload múltiplo, máx 8), `DELETE /brand-kit/reference-images/:index`.
- `apps/api/src/modules/brand-kit/brand-kit.service.ts`
- `apps/api/src/modules/brand-kit/dto/update-brand-kit.dto.ts` — valida `niche`, `competitors` (array de strings/URLs), `toneOfVoice` (texto livre, máx 2000 chars), `colorPalette` (objeto `{ primary, secondary, accent }[]` com validação de hex), `typography` (objeto `{ fontFamily, weights }`), `defaultImageSource` (enum `own_library|stock_bank|ai_generated`).
- `apps/api/src/common/services/storage.service.ts` — wrapper genérico de upload/delete sobre `@supabase/supabase-js` Storage (parametrizado por bucket), reusável pelos specs `012` (templates), `015` (render-engine) e `017` (imagem IA) depois.

### Lógica principal
1. `GET /brand-kit`: retorna o brand kit do workspace ativo, ou `404`/objeto vazio com defaults se ainda não foi configurado (onboarding não concluído).
2. `PUT /brand-kit`: upsert — cria se não existir, atualiza se existir. Só `workspace_admin`/`super_admin` pode editar (usar `@Roles`).
3. `POST /brand-kit/logo`: recebe multipart, valida tipo (PNG/SVG/JPG) e tamanho (máx 5MB), sobe pro S3 em `workspaces/{workspaceId}/brand/logo.{ext}`, salva a URL pública/assinada em `brand_kits.logo_url`.
4. `POST /brand-kit/reference-images`: mesmo padrão, mas array de até 8 imagens em `workspaces/{workspaceId}/brand/references/`, URLs acumuladas no campo `reference_images` (JSONB array).
5. Validação de negócio: se `defaultImageSource = 'ai_generated'`, o `PUT /brand-kit` deve **avisar** (não bloquear) se `reference_images` tiver menos de 3 imagens — retornar no payload de resposta um campo `warnings: string[]` (ex: "Recomendamos ao menos 3 imagens de referência para melhor fidelidade de marca na geração por IA").

## Critérios de Aceitação
- [ ] CA-01: `PUT /brand-kit` com payload válido cria o brand kit na primeira chamada e atualiza nas seguintes (idempotente por workspace).
- [ ] CA-02: `GET /brand-kit` de um workspace sem brand kit configurado não lança erro 500 — retorna 404 ou objeto vazio de forma previsível.
- [ ] CA-03: Upload de logo com arquivo > 5MB é rejeitado com 400 e mensagem clara.
- [ ] CA-04: Upload de 9ª imagem de referência é rejeitado (limite de 8).
- [ ] CA-05: Usuário com role `viewer` tentando `PUT /brand-kit` recebe 403.
- [ ] CA-06: `defaultImageSource = 'ai_generated'` com 0-2 imagens de referência salva com sucesso mas retorna `warnings` no payload.
- [ ] CA-07: Dados de brand kit de um workspace nunca aparecem em `GET /brand-kit` de outro workspace (reforça o teste de isolamento do spec `007`).

## Comandos de Validação
```bash
curl -s -X PUT http://localhost:3333/api/v1/brand-kit -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"niche":"moda sustentável","toneOfVoice":"direto, acolhedor","defaultImageSource":"ai_generated"}'
curl -s http://localhost:3333/api/v1/brand-kit -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
```

## Notas de Implementação
`competitors` no MVP é só uma lista de referências (nome/URL/@handle) usada pelo módulo de pesquisa (spec `020`/`021`) — não valida se o perfil existe de fato nesta spec, isso é responsabilidade do conector de pesquisa.
