# 014 Acervo de Templates Frontend

## Objetivo
Implementar a galeria de templates (sistema + próprios) e o editor visual de slot map, permitindo ao usuário mapear zonas de texto/imagem/logo sobre um template importado.

## Contexto
Segue os specs `012` (CRUD API) e `013` (importador). Ver PRD Seção 5.2, linha "Acervo de Templates": grid com toggle Sistema/Cliente, modal de importação com drag-and-drop, e "editor visual de slot map (arrastar retângulos sobre a imagem-base)".

## Stack
- **Framework**: Next.js, TanStack Query.
- **Editor de zonas**: canvas HTML5 via `react-konva` (permite desenhar/arrastar/redimensionar retângulos sobre uma imagem de fundo de forma direta).
- **Upload**: mesmo padrão de dropzone do spec `011`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `012-crud-template-assets-api`
- [ ] `013-importador-canva-gamma`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/templates/page.tsx` — galeria com toggle Sistema/Cliente, filtro por formato, grid de cards com preview (`preview_url`).
- `apps/web/app/(workspace)/templates/import/page.tsx` (ou modal) — dropzone de arquivo + seleção de formato/fonte, chama `POST /templates/import` (spec `013`).
- `apps/web/app/(workspace)/templates/[id]/edit/page.tsx` — editor visual: carrega o template, renderiza a(s) imagem(ns) de fundo num canvas Konva, permite desenhar retângulos, classificar cada um como `text | image | logo`, nomear (ex: "headline", "cta", "imagem-produto"), e salvar via `PUT /templates/:id`.
- `apps/web/app/(workspace)/onboarding/templates/page.tsx` — tela do onboarding (referenciada pelo spec `011`) reaproveitando o componente de galeria em modo "seleção múltipla" para o usuário escolher templates iniciais.
- `apps/web/components/templates/SlotMapEditor.tsx` — componente Konva reutilizável entre a tela de edição e (potencialmente) o preview do editor de conteúdo (spec `019`).
- `apps/web/hooks/useTemplates.ts` — hook TanStack Query sobre os endpoints do spec `012`.

### Lógica principal
1. Galeria: `useQuery` com `source` como parâmetro reativo ao toggle; cards mostram badge "Sistema" ou "Seu" e o formato (post/carrossel).
2. Editor de slot map: para templates de carrossel, navegação entre slides (um slot_map pode ter zonas por slide ou zonas compartilhadas — decisão: **cada slide tem seu próprio conjunto de zonas dentro do mesmo `slot_map.zones[]`, com um campo `slideIndex`** para simplificar templates onde cada slide tem layout diferente).
3. Cada zona desenhada no canvas vira um objeto `{ id, type, slideIndex, x, y, width, height, label }`; salvar dispara `PUT /templates/:id` com o `slot_map` completo.
4. Zona do tipo `text` tem um campo adicional no editor: `maxLength` sugerido (ajuda o motor de copy, spec `022`, a não gerar texto longo demais pro espaço).
5. Templates de sistema (`is_system_template=true`) abrem o editor em modo **somente leitura** (sem botão salvar) — só workspaces podem editar os próprios.

## Critérios de Aceitação
- [ ] CA-01: Galeria alterna corretamente entre templates de sistema e do workspace ao trocar o toggle.
- [ ] CA-02: Importar um PDF de carrossel (via spec `013`) resulta num template navegável por slide no editor, cada slide com sua imagem de fundo correta.
- [ ] CA-03: Desenhar uma zona no canvas, salvar, recarregar a página — a zona persiste com as mesmas coordenadas.
- [ ] CA-04: Tentar editar um template de sistema não mostra controles de edição (somente visualização).
- [ ] CA-05: Zona classificada como `text` aceita definir um `maxLength`; zonas `image`/`logo` não mostram esse campo.
- [ ] CA-06: Tela de onboarding (`/onboarding/templates`) permite selecionar múltiplos templates de sistema e avançar, sem exigir edição de slot map nesse momento (templates de sistema já vêm prontos).

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: importar um template, mapear zonas, salvar, recarregar e validar persistência
```

## Notas de Implementação
`react-konva` foi escolhido em vez de uma lib de drag-and-drop mais genérica porque o caso de uso (retângulos sobre imagem, com resize) é exatamente o forte de canvas-based libs. Se a equipe preferir DOM puro (divs posicionadas com CSS + `react-rnd`), é uma troca válida — manter a mesma interface de dados (`slot_map.zones[]`) para não impactar o render-engine (spec `015`).
