# 026 Fila de Aprovação (API + Frontend)

## Objetivo
Implementar a fila onde peças `pending_approval` aguardam decisão humana (aprovar, editar, rejeitar) antes de seguir para agendamento.

## Contexto
Segue o spec `025` (content-pieces-api e sua máquina de estados). Ver PRD módulo 7 (Fila de Aprovação) e Seção 5.2. Esta spec cobre tanto os endpoints de decisão quanto a tela — optou-se por juntar API+Frontend num único spec aqui porque a lógica de backend é pequena (poucas transições de estado já definidas no spec `025`) e separar geraria uma spec de API artificialmente pequena.

## Stack
- **Backend**: NestJS (extensão do módulo `content-pieces` do spec `025`).
- **Frontend**: Next.js, TanStack Query com mutation otimista (aprovar/rejeitar remove o card da lista imediatamente, antes da confirmação do servidor, com rollback em caso de erro).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `025-content-pieces-api`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/content-pieces/approval.controller.ts` — `POST /content-pieces/:id/approve`, `POST /content-pieces/:id/reject` (`{ reason: string }`), `GET /content-pieces?status=pending_approval` (já coberto pelo spec `025`, reusar).
- `apps/web/app/(workspace)/approval-queue/page.tsx` — lista de cards em fila.
- `apps/web/components/approval-queue/ApprovalCard.tsx` — preview da imagem, copy, origem (manual/piloto automático), badge extra "Gerado por IA" quando algum slide usa `image_source='ai_generated'` (reforça visualmente por que aquela peça está ali mesmo com piloto 100% automático configurado), botões Aprovar/Editar/Rejeitar.
- `apps/web/components/approval-queue/RejectModal.tsx` — modal pedindo motivo da rejeição (texto livre, salvo para eventual uso futuro de aprendizado).
- `apps/web/hooks/useApprovalQueue.ts`.

### Lógica principal
1. `POST /content-pieces/:id/approve`: transição `pending_approval → approved` (reusa `state-machine.ts` do spec `025`); só permitido para roles `editor`, `workspace_admin`, `super_admin` (nunca `viewer`).
2. `POST /content-pieces/:id/reject`: transição `pending_approval → rejected`, salva o motivo (adicionar campo `rejection_reason` em `content_pieces` via migration, se ainda não existir).
3. "Editar" no card não é uma transição de estado — leva de volta para o editor de conteúdo (spec `019`) com a peça carregada; salvar lá mantém em `draft`/`pending_approval` conforme o fluxo normal.
4. Frontend: fila ordenada por `created_at ASC` (mais antigas primeiro, evita que peças fiquem esquecidas no fundo), com filtro por rede-destino e por origem.
5. Aprovar uma peça não a agenda automaticamente — só a deixa pronta para o agendamento (spec `030`/Fase 6 lida com o próximo passo); deixar claro na UI que "aprovar" e "agendar" são ações distintas neste ponto do fluxo manual (no piloto automático, o workflow do n8n é quem encadeia aprovação → agendamento).

## Critérios de Aceitação
- [ ] CA-01: Peças em `pending_approval` aparecem na fila; peças em outros status, não.
- [ ] CA-02: Aprovar uma peça remove da fila imediatamente (otimista) e o status no banco vira `approved`.
- [ ] CA-03: Rejeitar exige motivo preenchido (validação de formulário) antes de confirmar.
- [ ] CA-04: Usuário com role `viewer` não vê os botões de ação (somente leitura), mesmo que tente via chamada direta à API (backend também bloqueia, não só a UI).
- [ ] CA-05: Peças com imagem gerada por IA mostram claramente o badge correspondente na fila.
- [ ] CA-06: Falha de rede ao aprovar reverte o card de volta pra lista (rollback do estado otimista) e mostra toast de erro.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/content-pieces/<id>/approve -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
pnpm --filter web dev  # validar UI manualmente
```

## Notas de Implementação
O motivo de rejeição (`rejection_reason`) é salvo mas **não** alimenta nenhum loop de aprendizado automático no MVP — isso é mencionado no PRD como possibilidade futura (Fase 3 do roadmap, "aprendizado contínuo"), não faz parte do escopo desta spec além de persistir o dado para uso futuro.
