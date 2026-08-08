# 019 Composição Frontend (Editor de Geração de Conteúdo)

## Objetivo
Implementar a tela onde o usuário gera e ajusta uma peça de conteúdo: escolhe/gera copy, escolhe template e fonte de imagem, e visualiza o resultado composto em tempo real.

## Contexto
Esta é a tela central de uso manual do produto (PRD Seção 5.2, linha "Editor de Geração de Conteúdo"), conectando os specs `014` (templates), `015` (render-engine), `016`/`017`/`018` (fontes de imagem) e `022` (copy — Fase 4, pode não estar pronta ainda quando este spec rodar; implementar com um textarea manual como fallback caso o endpoint de copy ainda não exista, e trocar depois).

## Stack
- **Framework**: Next.js, TanStack Query, split view (briefing à esquerda, preview à direita).
- **Preview**: renderiza a imagem retornada pelo render-engine (spec `015`) — não reimplementa a composição no client, só exibe o resultado já pronto.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `014-acervo-templates-frontend`
- [ ] `015-render-engine-servico`
- [ ] `016-integracao-banco-imagens`
- [ ] `017-motor-geracao-imagem-ia`
- [ ] `018-qa-visao-imagem-ia`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/content/new/page.tsx` — split view: briefing/insight à esquerda, preview da peça à direita.
- `apps/web/components/content-editor/BriefingPanel.tsx` — campo de briefing manual OU seleção de um insight existente (endpoint do spec `020`, se disponível — senão, campo de texto livre "do que é o post?").
- `apps/web/components/content-editor/TemplateSelector.tsx` — reusa a galeria do spec `014` em modo seleção única, com preview miniatura.
- `apps/web/components/content-editor/ImageSourceSelector.tsx` — 3 opções (Biblioteca Própria / Banco de Imagens / Geração com IA) por peça, com o default vindo de `brand_kit.default_image_source` mas sobrescrevível; ao escolher "Banco de Imagens", mostra busca inline (spec `016`); ao escolher "Geração com IA", mostra botão "Gerar imagem" que dispara o spec `017` e um indicador de progresso enquanto o QA (spec `018`) roda (polling ou WebSocket simples — MVP: polling a cada 3s em `GET /image-generation/jobs/:id` até `status` sair de `pending`).
- `apps/web/components/content-editor/NetworkSelector.tsx` — Instagram / Facebook / LinkedIn, muda a proporção do preview e o `targetFormat` disponível (carrossel LinkedIn vira aviso "será publicado como documento PDF").
- `apps/web/components/content-editor/PreviewPane.tsx` — exibe a imagem composta (chamando `POST /content-pieces/:id/render`, que a API expõe orquestrando o spec `015` — este endpoint específico deve ser criado no spec `025`, este spec `019` só o consome).
- `apps/web/hooks/useContentEditor.ts` — orquestra o estado do formulário completo (briefing, template, fonte de imagem, rede) e as mutations.

### Lógica principal
1. Fluxo: usuário escreve/seleciona briefing → clica "Gerar Copy" (chama endpoint do spec `022`; se não existir ainda, esconder o botão e permitir digitar o copy manualmente) → escolhe template → escolhe fonte de imagem → sistema compõe o preview automaticamente sempre que copy+template+imagem estiverem todos definidos.
2. Ao trocar de template ou de rede-destino, o preview é re-renderizado (nova chamada ao render-engine via API) sem recarregar a página.
3. Quando a fonte de imagem é "Geração com IA": desabilitar o botão de renderizar preview até o job de geração+QA concluir (`qa_passed` ou `escalated_to_human`); mostrar claramente ao usuário quando uma imagem foi escalada para revisão manual por não passar no QA automático.
4. Botão final "Enviar para Aprovação" ou "Agendar" (dependendo da configuração de aprovação do workspace, que só é resolvida no spec `025`/`026` — aqui só existe o botão, a lógica de para onde ele leva é dessas specs).

## Critérios de Aceitação
- [ ] CA-01: Selecionar um template e uma fonte de imagem (Biblioteca Própria, com upload direto) produz um preview renderizado visível na tela em menos de 10s.
- [ ] CA-02: Trocar a rede-destino de Instagram para LinkedIn com um template de carrossel atualiza o preview e exibe o aviso de que será publicado como PDF.
- [ ] CA-03: Escolher "Geração com IA" e clicar em "Gerar imagem" mostra estado de carregamento, depois exibe a imagem aprovada automaticamente ou um aviso de "aguardando revisão manual" se escalada.
- [ ] CA-04: Trocar de template depois de já ter uma imagem de IA aprovada mantém a imagem (não força regeração) — só o layout do template muda.
- [ ] CA-05: Texto de copy mais longo que o `maxLength` da zona mostra um aviso visual no editor antes mesmo de renderizar (validação client-side espelhando a regra do render-engine).

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: percorrer o fluxo completo para as 3 fontes de imagem e as 3 redes, validando os CAs acima
```

## Notas de Implementação
Se o spec `022` (geração de copy) ainda não estiver pronto quando este spec for executado, implementar o campo de copy como textarea manual e deixar um `TODO` claro no componente `BriefingPanel.tsx` indicando onde a integração automática entra — não bloquear esta spec esperando a `022`.
