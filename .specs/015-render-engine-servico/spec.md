# 015 Render Engine Serviço

## Objetivo
Criar o serviço que compõe a peça final (post estático ou slide de carrossel) injetando copy + imagem de fundo + brand kit sobre o slot_map de um template, exportando no formato nativo de cada rede.

## Contexto
Este é o motor de composição visual descrito no PRD módulo 6 e Seção 7.2/7.3 (`services/render-engine`). Ele **nunca** decide de onde vem a imagem de fundo (isso já chega pronto — de biblioteca própria, banco de imagens ou geração por IA, especs `016`/`017`/`018`) e **nunca** gera texto (isso já chega pronto do spec `022`). A responsabilidade deste serviço é puramente determinística: dado `(template.slot_map, brand_kit, copy_text, background_image_url)`, produzir a imagem final. Isso é o que garante fidelidade de marca 100% das vezes, conforme decisão de arquitetura do PRD Seção 7.7.

## Stack
- **Runtime**: Node.js + TypeScript, serviço HTTP standalone (`services/render-engine`), consumido pela API via HTTP interno (não exposto publicamente).
- **Renderização**: HTML/CSS template gerado dinamicamente a partir do `slot_map` + Playwright (headless Chromium) tirando screenshot da zona renderizada; alternativa mais leve `satori` + `resvg` para não depender de um browser inteiro — **decisão: usar Playwright no MVP** por maior fidelidade tipográfica/CSS, otimizar para Satori só se o custo de CPU em produção justificar.
- **Pós-processamento**: `sharp` para redimensionar/exportar em JPEG/PNG nas resoluções exatas por rede, e para unir slides de carrossel do LinkedIn num único PDF (`pdf-lib`).
- **Armazenamento**: Supabase Storage (bucket `content-renders`), via `@supabase/supabase-js`.
- **Variáveis de ambiente necessárias**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `012-crud-template-assets-api` — precisa da estrutura de `slot_map` definida.
- [ ] `010-crud-brand-kit-api` — precisa da estrutura de brand kit (cores/tipografia/logo).

## O que implementar

### Arquivos a CRIAR
- `services/render-engine/package.json`, `tsconfig.json`, `Dockerfile`.
- `services/render-engine/src/server.ts` — servidor HTTP mínimo (Fastify ou Express), rota `POST /render`.
- `services/render-engine/src/htmlBuilder.ts` — converte `slot_map.zones[]` + dados em um documento HTML/CSS posicionado absolutamente (cada zona vira uma `div` posicionada por `x,y,width,height`), aplicando `brand_kit.colorPalette`/`typography` como estilo.
- `services/render-engine/src/renderStaticPost.ts` — renderiza 1 imagem (post único).
- `services/render-engine/src/renderCarouselSlides.ts` — renderiza N imagens (uma por slide) + monta o PDF equivalente para LinkedIn.
- `services/render-engine/src/networkFormats.ts` — tabela de resoluções alvo: Instagram feed (1080x1350, 4:5), Instagram feed quadrado (1080x1080), Facebook (1200x630 ou 1080x1080), LinkedIn (1200x1200 para imagem única, PDF A4/16:9 para documento).
- `services/render-engine/src/storage.ts` — upload do resultado pro bucket `content-renders` do Supabase Storage, retorna URL pública.

### Lógica principal
1. `POST /render` recebe: `{ templateId, slotMap, brandKit, copyPerSlide: string[], backgroundImageUrls: string[], targetNetwork: 'instagram'|'facebook'|'linkedin', targetFormat: 'static_post'|'carousel' }` (a API monta esse payload a partir das tabelas `content_pieces`/`content_slides`/`template_assets`/`brand_kits` antes de chamar o render-engine — o render-engine em si não conhece o banco de dados, é stateless).
2. Para cada slide: monta o HTML com `htmlBuilder`, injeta a imagem de fundo daquele slide na zona `type=image`, o texto correspondente na(s) zona(s) `type=text` (respeitando `maxLength` da zona — truncar com reticências se o copy vier maior, nunca deixar overflow visual), a logo na zona `type=logo`.
3. Playwright abre o HTML numa viewport do tamanho exato do `targetNetwork`/`targetFormat` (tabela `networkFormats`) e tira o screenshot.
4. Se `targetNetwork = linkedin` e `targetFormat = carousel`: além das imagens individuais, gera também um PDF multi-página juntando todos os slides na ordem (necessário porque carrossel do LinkedIn é post de documento — ver PRD módulo 8).
5. Resultado(s) sobem pro storage em `workspaces/{workspaceId}/content/{contentPieceId}/slide-{n}.png` (e `.pdf` quando aplicável); a resposta retorna as URLs.
6. Timeout de 30s por render; erro de renderização retorna 422 com detalhe de qual zona falhou (ex: imagem de fundo inacessível).

### Schema / Tipos (se aplicável)
```typescript
interface RenderRequest {
  templateId: string;
  slotMap: { zones: Zone[] };
  brandKit: { colorPalette: Record<string,string>; typography: { fontFamily: string }; logoUrl: string };
  copyPerSlide: string[];
  backgroundImageUrls: string[];
  targetNetwork: 'instagram' | 'facebook' | 'linkedin';
  targetFormat: 'static_post' | 'carousel';
}
interface RenderResponse {
  slides: { order: number; imageUrl: string }[];
  documentUrl?: string; // presente apenas quando linkedin+carousel
}
```

## Critérios de Aceitação
- [ ] CA-01: Renderizar um `static_post` para Instagram produz 1 imagem com dimensão exata 1080x1350 (ou 1080x1080, conforme `targetFormat`/config).
- [ ] CA-02: Renderizar um `carousel` de 5 slides para Instagram produz 5 imagens na ordem correta.
- [ ] CA-03: Renderizar um `carousel` para LinkedIn produz as imagens individuais **e** um PDF multi-página com os slides na ordem certa.
- [ ] CA-04: Texto que excede o `maxLength` da zona é truncado com reticências, nunca vaza visualmente para fora da zona (validar com um caso de teste de copy propositalmente longo).
- [ ] CA-05: Logo do brand kit aparece corretamente posicionada na zona `type=logo` em todos os formatos testados.
- [ ] CA-06: Requisição com `backgroundImageUrl` inacessível (404) retorna erro 422 claro, sem travar o processo do serviço.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3334/render -H "Content-Type: application/json" -d @test-fixtures/render-request-carousel-linkedin.json
```

## Notas de Implementação
Este serviço é **stateless e sem acesso direto ao banco** — recebe tudo pronto no payload. Isso mantém o render-engine reutilizável e testável isoladamente (e mais fácil de escalar horizontalmente depois, conforme PRD Seção 7.6 "separar o render-engine em seu próprio VPS/worker pool").
