# 052 Chat de Suporte com IA

## Objetivo
Widget de chat com IA, disponível dentro do produto, que responde dúvidas do cliente com base na base de conhecimento e no contexto real da conta dele, com fallback para contato humano.

## Contexto
Requisito padrão (skill `padrao-saas-plg`, item 2). Ver PRD módulo 16. Segue os specs `050` (artigos da base de conhecimento) e reusa o `AnthropicService` já existente (specs `017`/`022`).

## Stack
- **Framework**: NestJS (RAG simples), Claude (Anthropic API).
- **Busca semântica**: no MVP, **sem vector database dedicado** — usar busca textual simples (`ILIKE`, já existente no spec `050`) para recuperar os 3-5 artigos mais relevantes por palavra-chave do que o usuário perguntou, e passar como contexto para o Claude responder. Evita adicionar mais um serviço de infra (pgvector é uma evolução natural se a base de artigos crescer muito, mas não é necessário no MVP).
- **Variáveis de ambiente necessárias**: `ANTHROPIC_API_KEY` (já configurada).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `050-central-ajuda-api`
- [ ] `007-multitenant-middleware`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/support-chat/support-chat.module.ts`
- `apps/api/src/modules/support-chat/support-chat.controller.ts` — `POST /support-chat/messages` (`{ message: string, conversationId?: string }`).
- `apps/api/src/modules/support-chat/support-chat.service.ts`
- `apps/api/src/modules/support-chat/dto/send-message.dto.ts`.
- `apps/web/components/support-chat/SupportChatWidget.tsx` — botão flutuante + painel de conversa, disponível em todas as telas `(workspace)/*`.

### Lógica principal
1. `POST /support-chat/messages`: busca os artigos mais relevantes (busca textual pela mensagem do usuário) + monta contexto da conta atual (plano, uso recente, se tem conta social conectada, se o piloto automático está ativo — dados já disponíveis via as tabelas existentes) + histórico da conversa (se `conversationId` fornecido).
2. Chama Claude com esse contexto + os artigos recuperados, instruído a responder com base neles e a admitir quando não sabe (em vez de inventar), sugerindo escalonar para suporte humano nesse caso.
3. Se a resposta da IA incluir um sinalizador de "não resolvido" (detectável via structured output — um campo booleano `resolved: boolean` retornado pelo próprio Claude junto da resposta), a UI mostra um botão "Falar com suporte humano" (que no MVP pode só abrir um `mailto:` ou formulário simples — não é escopo deste spec construir um sistema de tickets completo).
4. Conversas não são persistidas em tabela própria no MVP (sem histórico entre sessões) — se isso vier a ser necessário, adicionar uma tabela `support_conversations`/`support_messages` como extensão futura.

### Schema / Tipos (se aplicável)
```typescript
interface SupportChatResponse {
  reply: string;
  resolved: boolean;
  suggestedArticles: { slug: string; title: string }[];
}
```

## Critérios de Aceitação
- [ ] CA-01: Perguntar algo coberto por um artigo publicado retorna uma resposta baseada no conteúdo real daquele artigo (não genérica).
- [ ] CA-02: Perguntar algo fora do escopo da base de conhecimento resulta em `resolved: false` e sugestão de falar com suporte humano, sem a IA inventar uma resposta.
- [ ] CA-03: O contexto da conta (ex: "você ainda não conectou nenhuma rede social") aparece corretamente refletido quando relevante à pergunta.
- [ ] CA-04: Widget aparece em todas as telas do workspace, sem atrapalhar o uso normal da interface (z-index, posição consistente).

## Comandos de Validação
```bash
curl -s -X POST https://app.<dominio>/api/v1/support-chat/messages -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"message":"como eu conecto meu instagram?"}'
```

## Notas de Implementação
Métrica de sucesso do PRD (Seção 8, "dúvidas resolvidas pelo chat de IA sem escalar para humano ≥ 50%") depende do campo `resolved` sendo salvo/agregado em algum lugar mesmo sem histórico completo de conversa — gravar ao menos um contador agregado (ex: incrementar um contador em `funnel_events` como `event_name='support_chat_resolved'`/`'support_chat_escalated'`, reusando a infra do spec `046`) para essa métrica ser mensurável desde o MVP.
