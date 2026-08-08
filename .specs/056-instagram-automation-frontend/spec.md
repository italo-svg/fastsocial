# 056 Automação Instagram Frontend

## Objetivo
Tela onde o workspace (com o add-on contratado) cria e gerencia automações simplificadas de DM/comentário, e onde workspaces sem o add-on veem a oferta de upsell.

## Contexto
Segue os specs `053`-`055`. Ver PRD Seção 5.2, página "Automação Instagram (Módulo Pago)".

## Stack
- **Framework**: Next.js.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `053-instagram-automation-schema-entitlement`
- [ ] `055-instagram-automation-execution`

## O que implementar

### Arquivos a CRIAR
- `apps/web/app/(workspace)/automations/page.tsx` — se o workspace não tem o add-on: tela de upsell (explicação + botão "Contratar", chama `POST /addons/instagram_automation/subscribe`); se tem: lista de automações existentes.
- `apps/web/app/(workspace)/automations/new/page.tsx` — criador de fluxo simplificado: escolher gatilho (tipo + palavra-chave + conta), adicionar passos em sequência (dropdown de tipo de passo + campos correspondentes), nomear e salvar.
- `apps/web/app/(workspace)/automations/[id]/page.tsx` — detalhe/edição + estatísticas de disparo (contagem de `automation_runs` por status).
- `apps/web/components/automations/UpsellCard.tsx`, `FlowStepEditor.tsx`, `TriggerSelector.tsx`.
- `apps/web/hooks/useAutomations.ts`.

### Lógica principal
1. Editor de fluxo é uma lista ordenável simples (adicionar/remover/reordenar passos), não um canvas visual tipo diagrama — consistente com "automações simplificadas" do escopo do PRD.
2. Aviso explícito na UI sobre a janela de 24h de mensageria da Meta (spec `055`, Notas de Implementação) — usuário precisa entender essa limitação antes de configurar expectativa de automação "sempre responde".
3. Estatísticas por automação: total de disparos, taxa de sucesso, últimos 10 disparos com status.
4. Se o add-on for cancelado (via Configurações/Billing), a tela reverte para o estado de upsell automaticamente, mas os fluxos configurados continuam visíveis (desativados) caso o cliente recontrate.

## Critérios de Aceitação
- [ ] CA-01: Workspace sem o add-on vê a tela de upsell e consegue contratar (fluxo completo até o Checkout do Stripe).
- [ ] CA-02: Workspace com o add-on consegue criar um fluxo com gatilho + 2 passos e ele aparece corretamente na tabela `automation_flows`/`automation_flow_steps`.
- [ ] CA-03: Estatísticas de disparo refletem corretamente os dados de `automation_runs`.
- [ ] CA-04: Aviso da janela de 24h está visível no criador de fluxo, não escondido em tooltip.
- [ ] CA-05: Cancelar o add-on reverte a tela para upsell sem perder os fluxos já configurados (reaparecem se recontratado).

## Comandos de Validação
```bash
pnpm --filter web dev
```

## Notas de Implementação
Nenhuma.
