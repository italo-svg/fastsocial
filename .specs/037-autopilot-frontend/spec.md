# 037 Autopilot Frontend

## Objetivo
Implementar a tela de configuração do piloto automático, com toggle de ativação e histórico de execuções.

## Contexto
Segue o spec `036` (autopilot config API). Ver PRD Seção 5.2, linha "Piloto Automático (Configuração)" e Seção 5.1 (badge de status verde/âmbar/vermelho para piloto ativo/pausado/erro).

## Stack
- **Framework**: Next.js, React Hook Form, TanStack Query.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `036-autopilot-config-api`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/autopilot/page.tsx` — form de configuração + histórico.
- `apps/web/components/autopilot/CadenceInput.tsx` — input/slider de `postsPerWeek`.
- `apps/web/components/autopilot/FormatMixSlider.tsx` — slider duplo (estático vs. carrossel) que sempre soma 100%.
- `apps/web/components/autopilot/PreferredTimesInput.tsx` — inputs de horário (adicionar/remover).
- `apps/web/components/autopilot/ActivationToggle.tsx` — toggle grande com confirmação, mostrando mensagem de erro clara quando os pré-requisitos (spec `036` CA-02) não são atendidos.
- `apps/web/components/autopilot/RunsHistory.tsx` — tabela do histórico (`GET /autopilot/runs`), com status colorido por execução.
- `apps/web/hooks/useAutopilot.ts`.

### Lógica principal
1. Formulário completo (cadência, mix, aprovação, horários) salvo via `PUT /autopilot` só ao clicar em "Salvar" (não autosave, para evitar configuração acidental de algo que vai rodar sozinho).
2. Preview textual da configuração atual antes de salvar (ex: "Aprox. 5 posts/semana, 60% carrossel, com aprovação manual") — texto gerado no client a partir do estado do form, sem chamada à API.
3. Toggle de ativação é uma ação separada do salvamento do form (pode configurar sem ativar, ativar depois).
4. Card de status do piloto automático (verde=ativo, âmbar=pausado, vermelho=erro/pré-requisito faltando) reaproveitado também no Dashboard principal (spec futuro, se houver — aqui só garantir que o componente é isolado o suficiente para ser reusado).

## Critérios de Aceitação
- [ ] CA-01: Configurar e salvar os parâmetros do piloto automático reflete corretamente em `GET /autopilot` após reload.
- [ ] CA-02: Tentar ativar sem conta social conectada mostra a mensagem de erro vinda da API de forma clara na UI, sem termos técnicos.
- [ ] CA-03: O slider de mix de formatos nunca permite somar mais ou menos que 100% (ajuste automático do lado complementar ao mover um dos dois).
- [ ] CA-04: Histórico de execuções mostra corretamente as peças geradas automaticamente, agrupadas por período.
- [ ] CA-05: Desativar o piloto automático (toggle off) é uma ação de 1 clique, sem exigir confirmação extra além do próprio toggle (diferente de ativar, que pode falhar por pré-requisito — desativar nunca falha).

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: configurar, ativar (com e sem pré-requisitos), desativar, validar histórico
```

## Notas de Implementação
Nenhuma.
