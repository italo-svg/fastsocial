# 022 Geração de Copy via Claude

## Objetivo
Gerar copy/roteiro para post estático, carrossel ou reels a partir de um insight ou briefing manual, sempre calibrado pelo tom de voz do brand kit daquele workspace específico.

## Contexto
Segue os specs `010` (brand kit) e `020` (insights). Ver PRD módulo 5 (Geração de Copy & Roteiros). Este é o serviço que a tela de Editor de Conteúdo (spec `019`) e o piloto automático (Fase 7) consomem para produzir texto. Fundamental: o copy **não é genérico** — é sempre montado com o `tone_of_voice` e `niche` do brand kit como contexto obrigatório do prompt.

## Stack
- **Framework**: NestJS.
- **LLM**: Claude (Anthropic API) via `AnthropicService` (criado no spec `017`, reusar aqui — se este spec rodar antes do `017` em paralelo, criar o `AnthropicService` aqui e o `017` reusa; a spec que rodar primeiro cria, documentar isso para quem executar em paralelo verificar se o arquivo já existe antes de recriar).
- **Variáveis de ambiente necessárias**: `ANTHROPIC_API_KEY`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `010-crud-brand-kit-api`
- [ ] `020-pesquisa-tendencias-api` (para poder referenciar um insight, embora briefing manual também deva funcionar sem isto).

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/copy-generation/copy-generation.module.ts`
- `apps/api/src/modules/copy-generation/copy-generation.controller.ts` — `POST /copy-generation/generate` (`{ insightId?: string; briefing?: string; format: 'static_post'|'carousel'|'reels_script'; slideCount?: number; variationHint?: string }`).
- `apps/api/src/modules/copy-generation/copy-generation.service.ts`
- `apps/api/src/modules/copy-generation/prompt-templates.ts` — templates de prompt por formato.

### Lógica principal
1. Recebe `insightId` (busca o `summary` do insight) OU `briefing` (texto livre do usuário) — ao menos um dos dois é obrigatório.
2. Monta o prompt com: brand kit (`tone_of_voice`, `niche`) + o conteúdo do insight/briefing + instrução de formato:
   - `static_post`: 1 texto de legenda (limite configurável, sugestão 150-300 caracteres para o "gancho" + legenda completa separada).
   - `carousel`: um texto curto por slide (`slideCount`, default 5), sendo o primeiro slide sempre a "capa" (gancho forte) e o último sempre um CTA.
   - `reels_script`: roteiro com marcação de cena/tempo (`[0-3s] ...`, `[3-8s] ...`), sem gerar vídeo, só o texto do roteiro.
3. Se `variationHint` for passado (ex: "mais direto", "com CTA de venda"), inclui como instrução adicional de regeneração — usado pelo botão "regenerar" do editor (spec `019`).
4. Resposta estruturada em JSON (usar tool use / structured output da API Anthropic para garantir parsing confiável, não regex sobre texto livre).
5. Não persiste automaticamente em `content_pieces`/`content_slides` — isso é responsabilidade do spec `025` (que chama este endpoint e depois salva o resultado). Este serviço é "puro": recebe input, devolve copy gerado.

### Schema / Tipos (se aplicável)
```typescript
interface GenerateCopyRequest {
  insightId?: string;
  briefing?: string;
  format: 'static_post' | 'carousel' | 'reels_script';
  slideCount?: number;
  variationHint?: string;
}
interface GenerateCopyResponse {
  slides: { order: number; text: string }[]; // 1 item para static_post
  scriptScenes?: { timeRange: string; text: string }[]; // apenas reels_script
}
```

## Critérios de Aceitação
- [ ] CA-01: Gerar copy para dois workspaces com `tone_of_voice` claramente distintos (ex: um "formal e técnico", outro "descontraído e emoji-heavy") produz textos perceptivelmente diferentes em estilo para o mesmo insight — validar manualmente com um caso de teste fixo.
- [ ] CA-02: `format=carousel` com `slideCount=5` retorna exatamente 5 itens em `slides`, ordenados.
- [ ] CA-03: Nem `insightId` nem `briefing` fornecidos retorna 400 com mensagem clara.
- [ ] CA-04: `variationHint="mais direto"` numa segunda chamada sobre o mesmo briefing produz um texto visivelmente diferente da primeira geração (não idêntico).
- [ ] CA-05: Resposta sempre é JSON válido e parseável — nunca texto livre com formatação inconsistente (testar robustez com 10 chamadas seguidas).

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/copy-generation/generate -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"briefing":"Lançamento de nova coleção sustentável","format":"carousel","slideCount":5}'
```

## Notas de Implementação
Usar o recurso de "tool use" / structured output da API da Anthropic (definir um schema JSON esperado como tool) em vez de pedir "responda em JSON" via texto livre — isso reduz drasticamente falha de parsing em produção.
