# 016 Integração Banco de Imagens

## Objetivo
Implementar a fonte de imagem "Banco de Imagens" — busca de fotos de stock com licença comercial via API externa, como alternativa à Biblioteca Própria e à Geração com IA.

## Contexto
Segue o spec `010` (brand kit, onde `default_image_source` é configurado). Esta é uma das três fontes de imagem de fundo do Módulo 6 do PRD. É a mais simples das três (comparado à Geração com IA, spec `017`) — só busca e licenciamento, sem geração nem QA.

## Stack
- **Framework**: NestJS.
- **Provider**: Unsplash API (`api.unsplash.com`), com fallback documentado para Pexels caso a chave do Unsplash não esteja disponível (mesma interface, dois adapters).
- **Variáveis de ambiente necessárias**: `UNSPLASH_ACCESS_KEY` (opcional — sem ela, o endpoint retorna 501 "fonte não configurada", nunca derruba o resto do sistema).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `010-crud-brand-kit-api`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/image-sources/stock-images.module.ts`
- `apps/api/src/modules/image-sources/stock-images.controller.ts` — `GET /image-sources/stock?query=<termo>&orientation=<square|portrait|landscape>`.
- `apps/api/src/modules/image-sources/stock-images.service.ts` — chama a API do Unsplash, filtra por `license: commercial` quando o provider suportar esse filtro nativamente, normaliza a resposta.
- `apps/api/src/modules/image-sources/adapters/unsplash.adapter.ts`, `adapters/pexels.adapter.ts` (stub, pode ficar não-implementado com `throw NotImplementedException` se não for prioridade agora — a interface deve existir para facilitar troca futura).

### Lógica principal
1. `GET /image-sources/stock?query=...`: repassa a busca para o provider configurado, retorna lista normalizada `{ id, thumbnailUrl, fullUrl, attribution, provider }`.
2. Ao selecionar uma imagem no frontend (spec `019`), a URL `fullUrl` é o que vai para `content_slides.background_image_url` com `image_source = 'stock_bank'` — nenhum download/cópia pro storage próprio é necessário no MVP (linkar direto a URL do provider é aceitável, já que o render-engine só precisa buscar a imagem para compor).
3. Cache simples em Redis (TTL 1h) por `query` para não estourar rate limit do Unsplash em uso repetido.
4. Sem `UNSPLASH_ACCESS_KEY` configurada: endpoint retorna `501 Not Implemented` com mensagem clara — o frontend deve ocultar/desabilitar a opção "Banco de Imagens" quando esse endpoint sinalizar indisponibilidade (checar via um `GET /image-sources/status`).

## Critérios de Aceitação
- [ ] CA-01: Com `UNSPLASH_ACCESS_KEY` válida, `GET /image-sources/stock?query=café` retorna ao menos 1 resultado normalizado.
- [ ] CA-02: Sem a chave configurada, o endpoint retorna 501 sem derrubar o resto da API (outros endpoints continuam funcionando).
- [ ] CA-03: Buscas repetidas pela mesma `query` dentro de 1h usam o cache (validar via header de resposta customizado `X-Cache: HIT/MISS` ou log).
- [ ] CA-04: `GET /image-sources/status` reflete corretamente se o provider está configurado ou não.

## Comandos de Validação
```bash
curl -s "http://localhost:3333/api/v1/image-sources/stock?query=moda" -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
curl -s http://localhost:3333/api/v1/image-sources/status -H "Authorization: Bearer <token>"
```

## Notas de Implementação
Esta é a spec mais simples da Fase 3 e serve também como o primeiro teste de integração real com uma API externa no projeto — útil para validar o padrão de "modo mock quando a credencial não existe" antes de aplicar o mesmo padrão nos specs mais críticos (`017`, `028`, `029`).
