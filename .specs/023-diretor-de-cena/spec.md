# 023 Diretor de Cena

## Objetivo
Traduzir um insight/copy em uma descrição de cena visual concreta (scene brief), usada como camada 2 do prompt de geração de imagem por IA (spec `017`).

## Contexto
Segue o spec `022` (geração de copy) e é consumido pelo spec `017` (motor de geração de imagem). Ver PRD Seção 7.7, camada `[2] SCENE BRIEF`. Esta é uma responsabilidade pequena e isolada o suficiente para merecer seu próprio spec (evita que o spec `017` fique sobrecarregado com lógica de "criatividade de cena" além da montagem de prompt em si).

## Stack
- **Framework**: NestJS.
- **LLM**: Claude, reusando `AnthropicService`.
- **Variáveis de ambiente necessárias**: `ANTHROPIC_API_KEY` (já configurada por specs anteriores).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `022-geracao-copy-claude` — reusa o `AnthropicService` e o padrão de structured output estabelecido lá.

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/image-generation/scene-director.service.ts` — colocado dentro do módulo `image-generation` (criado pelo spec `017`; se este spec rodar antes, criar o módulo aqui e o `017` reusa — mesma nota de execução em paralelo do spec `022`).

### Lógica principal
1. Função `buildSceneBrief(input: { copyText: string; niche: string; toneKeywords: string[]; textZonePosition: 'top'|'bottom'|'left'|'right'|'center' }): Promise<string>`.
2. Prompt para Claude: dado o tema do copy e o nicho/tom da marca, descrever em 2-3 frases um cenário fotográfico concreto (sujeito, ambiente, ação/mood) que ilustre o tema **sem ilustrar o texto literalmente** (ex: para um post sobre "economia de tempo", a cena não deve conter um relógio genérico clichê — instruir o prompt do diretor de cena a evitar literalidade óbvia de estoque).
3. Sempre inclui a instrução de espaço negativo baseada em `textZonePosition` (ex: `"Composition leaves clear negative space in the bottom third for text overlay."`).
4. Retorna string pronta para ser concatenada como camada 2 do prompt final (spec `017` faz a concatenação, este serviço só produz o texto da camada).

## Critérios de Aceitação
- [ ] CA-01: Para um copy sobre um tema concreto (ex: "dica de produtividade para empreendedores"), o scene brief gerado descreve uma cena plausível e não-clichê, sem mencionar texto/palavras a serem desenhadas na imagem.
- [ ] CA-02: `textZonePosition='bottom'` sempre resulta numa instrução de espaço negativo mencionando a parte inferior da composição; `'top'`, a parte superior; etc.
- [ ] CA-03: O scene brief nunca excede ~3 frases (evitar prompts de imagem excessivamente longos, que tendem a confundir o modelo de geração).
- [ ] CA-04: Chamadas repetidas com o mesmo input produzem cenas variadas (não determinístico ao ponto de repetir a mesma cena sempre) — validar gerando 3x e comparando.

## Comandos de Validação
```bash
pnpm --filter api test scene-director.service.spec.ts
```

## Notas de Implementação
Este serviço é deliberadamente pequeno — a tentação é fundir com o `prompt-builder.service.ts` do spec `017`, mas mantê-lo separado facilita testar e ajustar a qualidade da "direção de cena" isoladamente do resto da montagem de prompt (âncoras técnicas, negative list etc. são fixas e não precisam de LLM; só a cena em si precisa).
