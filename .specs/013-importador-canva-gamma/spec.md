# 013 Importador Canva/Gamma

## Objetivo
Permitir que o cliente traga templates próprios exportados do Canva ou do Gamma e o sistema normalize isso em um `template_asset` com slot_map utilizável pelo render-engine.

## Contexto
Segue o spec `012` (CRUD de templates). Canva/Gamma não têm uma API de exportação estruturada que já entregue "zonas editáveis" — o que o cliente exporta é um PDF ou conjunto de imagens estáticas. Por isso, o "import" no MVP é **semi-assistido**: o usuário faz upload do arquivo, o sistema converte em imagem(ns) de referência, e o usuário desenha manualmente as zonas (texto/imagem/logo) por cima usando o editor visual do spec `014` — este spec cobre a parte de **normalização do arquivo bruto**, não o editor de zonas em si (que é frontend puro, spec `014`).

## Stack
- **Framework**: NestJS.
- **Processamento de PDF/imagem**: `pdf-lib` ou `pdf2pic` para converter páginas de PDF (export do Canva/Gamma) em imagens PNG, uma por slide/página.
- **Variáveis de ambiente necessárias**: nenhuma nova além das já existentes de storage.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `012-crud-template-assets-api`

## O que implementar

### Arquivos a CRIAR
- `services/template-importer/src/index.ts` — serviço standalone (ou módulo dentro da API se a equipe preferir simplicidade no MVP — decisão: **implementar como módulo dentro de `apps/api`** para reduzir complexidade operacional, não como microserviço separado, ao contrário do que a árvore de pastas do PRD sugeria; deixar isso documentado aqui como desvio consciente).
- `apps/api/src/modules/templates/import.controller.ts` — `POST /templates/import` (multipart: arquivo PDF ou imagens + `format: static_post|carousel` + `source: canva_import|gamma_import`).
- `apps/api/src/modules/templates/import.service.ts` — lógica de conversão.

### Lógica principal
1. Recebe o arquivo (PDF de 1 página → `static_post`; PDF multi-página ou múltiplas imagens → `carousel`, uma página/imagem por slide).
2. Se PDF: converte cada página em PNG (resolução mínima 1080px no lado maior) e sobe cada uma pro storage (`workspaces/{workspaceId}/templates/imported/{templateId}/slide-{n}.png`).
3. Se imagens diretas (PNG/JPG): valida dimensão mínima e sobe diretamente, uma por slide.
4. Cria o `template_asset` com `source` = `canva_import` ou `gamma_import`, `slot_map` **vazio/placeholder** (`{ zones: [], backgroundImages: [urls das páginas convertidas] }`) e `preview_url` apontando pra primeira página — o usuário completa o `slot_map` de fato no editor visual (spec `014`), que faz `PUT /templates/:id` depois.
5. Limite: máximo 10 páginas/slides por import (alinhado ao limite de carrossel do Instagram) e 20MB de tamanho de arquivo.

## Critérios de Aceitação
- [ ] CA-01: Upload de um PDF de 1 página cria um `template_asset` `format=static_post` com 1 imagem de fundo convertida.
- [ ] CA-02: Upload de um PDF de 5 páginas cria um `template_asset` `format=carousel` com 5 imagens de fundo, uma por página, na ordem correta.
- [ ] CA-03: Upload de PDF com 11+ páginas é rejeitado com mensagem clara sobre o limite.
- [ ] CA-04: Upload de arquivo que não é PDF nem imagem (ex: .docx) é rejeitado com 400.
- [ ] CA-05: O `template_asset` criado aparece em `GET /templates?source=own` imediatamente após o import, pronto para ser aberto no editor visual.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/templates/import -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -F "file=@carrossel-canva.pdf" -F "format=carousel" -F "source=canva_import"
```

## Notas de Implementação
Este spec **não** tenta extrair texto/zonas automaticamente do PDF via OCR/heurística de layout no MVP — isso é uma feature de fase 2 do PRD ("editor visual avançado... reduzindo dependência de importação manual"). No MVP, o valor entregue é só "trazer a arte pronta e converter em base editável", com o mapeamento de zonas feito manualmente pelo usuário.
