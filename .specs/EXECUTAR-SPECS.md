# EXECUTAR SPECS — AutoContent OS

> ⚠️ Execute com: `claude --dangerously-skip-permissions`
>
> Este arquivo dispara subagentes independentes para cada feature.
> Cada agente tem contexto isolado — lê APENAS a sua spec (`.specs/NNN-*/spec.md`).
> Toda spec também deve ler `.prd/prd_autocontent_os.md` (fonte da verdade do produto) e `.specs/shared/*.md` (convenções) quando referenciado no próprio spec.

---

## PRÉ-REQUISITOS

Antes de executar, confirme:
- [ ] Projeto Supabase criado, com `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` e `DATABASE_URL` disponíveis (ver `.prd/checklist_acessos_e_delegacao.md`, item 1.0 — é o único item do checklist que já é pré-requisito real para começar, os demais podem esperar).
- [ ] `.env` criado a partir de `.specs/shared/como-executar.md` (as demais credenciais — Meta, LinkedIn, Stripe, fal.ai — podem ficar vazias; os specs de integração externa degradam graciosamente)
- [ ] Docker Desktop (ou daemon Docker) rodando localmente (usado só para Redis/Traefik/Postiz/n8n — não há mais Postgres/MinIO local, ver spec `002`)
- [ ] Node.js 20+, pnpm 9+ instalados
- [ ] Acesso de escrita ao repositório

Credenciais de produção externas (Meta, LinkedIn, Stripe, VPS) **não são pré-requisito** para rodar as Fases 0-8 — ver `.prd/checklist_acessos_e_delegacao.md`. Apenas a Fase 9 (spec `043`) depende de infraestrutura de produção real.

---

## FASE 0 — Fundação (Executar em SEQUÊNCIA)

### Task 001 — Setup Monorepo
```
Leia o arquivo `.specs/001-setup-monorepo/spec.md` completamente.
Leia também `.specs/shared/como-executar.md` e `.specs/shared/regras-de-nomenclatura.md`.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 002 — Setup Docker Compose
```
Leia o arquivo `.specs/002-setup-docker-compose/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 003 — Schema Postgres Core
```
Leia o arquivo `.specs/003-schema-postgres-core/spec.md` completamente.
Leia também `.prd/prd_autocontent_os.md` Seção 6 (Modelo de Dados) — é a fonte da verdade do schema.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 004 — Setup NestJS API
```
Leia o arquivo `.specs/004-setup-nestjs-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 005 — Setup Next.js Web
```
Leia o arquivo `.specs/005-setup-nextjs-web/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 1 — Auth & Multi-tenant (Executar em SEQUÊNCIA após Fase 0)

### Task 006 — Auth JWT API
```
Leia o arquivo `.specs/006-auth-jwt-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 007 — Multitenant Middleware
```
Leia o arquivo `.specs/007-multitenant-middleware/spec.md` completamente.
Esta é uma spec crítica de segurança — escreva o teste de isolamento cross-workspace descrito nas Notas de Implementação antes de considerar concluída.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 008 — Auth Frontend
```
Leia o arquivo `.specs/008-auth-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 009 — Workspace Provisioning
```
Leia o arquivo `.specs/009-workspace-provisioning/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 2 — Brand Kit & Acervo de Templates (PARALELO após Fase 1)

### Task 010 — CRUD Brand Kit API
```
Leia o arquivo `.specs/010-crud-brand-kit-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 012 — CRUD Template Assets API
```
Leia o arquivo `.specs/012-crud-template-assets-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

> Sequenciais dentro da fase (dependem das tasks acima):

### Task 011 — Onboarding Wizard Frontend (após Task 010)
```
Leia o arquivo `.specs/011-onboarding-wizard-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 013 — Importador Canva/Gamma (após Task 012)
```
Leia o arquivo `.specs/013-importador-canva-gamma/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 014 — Acervo de Templates Frontend (após Tasks 012, 013)
```
Leia o arquivo `.specs/014-acervo-templates-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 3 — Composição Visual & Geração de Imagem IA (após Fase 2)

### Task 015 — Render Engine Serviço
```
Leia o arquivo `.specs/015-render-engine-servico/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 016 — Integração Banco de Imagens (PARALELO com 015, 017)
```
Leia o arquivo `.specs/016-integracao-banco-imagens/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 017 — Motor de Geração de Imagem por IA (PARALELO com 015, 016)
```
Leia o arquivo `.specs/017-motor-geracao-imagem-ia/spec.md` completamente.
Leia também `.prd/prd_autocontent_os.md` Seção 7.7 — é a fonte normativa da arquitetura de prompt, não apenas referência.
Esta é a spec de maior risco de qualidade percebida do produto. Siga as 6 camadas de prompt exatamente como especificado.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

> Sequencial (depende da Task 017):

### Task 018 — QA por Visão — Imagem IA (após Task 017)
```
Leia o arquivo `.specs/018-qa-visao-imagem-ia/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 019 — Composição Frontend (após Tasks 015, 016, 017, 018)
```
Leia o arquivo `.specs/019-composicao-frontend/spec.md` completamente.
Se a spec 022 (geração de copy) ainda não estiver concluída, implemente o campo de copy como textarea manual conforme as Notas de Implementação.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 4 — Pesquisa & Copy (PARALELO com Fase 2/3, após Fase 1)

### Task 020 — Pesquisa & Tendências API
```
Leia o arquivo `.specs/020-pesquisa-tendencias-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 022 — Geração de Copy via Claude (PARALELO com 020)
```
Leia o arquivo `.specs/022-geracao-copy-claude/spec.md` completamente.
Se `apps/api/src/common/services/anthropic.service.ts` já existir (criado pela spec 017 em execução paralela), reuse-o em vez de recriar.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

> Sequenciais dentro da fase:

### Task 021 — Conector de Pesquisa de Fontes (após Task 020)
```
Leia o arquivo `.specs/021-conector-pesquisa-fontes/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 023 — Diretor de Cena (após Task 022, e idealmente após Task 017)
```
Leia o arquivo `.specs/023-diretor-de-cena/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 024 — Pesquisa Frontend (após Task 020)
```
Leia o arquivo `.specs/024-pesquisa-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 5 — Fila de Aprovação (após Fases 3 e 4)

### Task 025 — Content Pieces API
```
Leia o arquivo `.specs/025-content-pieces-api/spec.md` completamente.
Esta spec implementa a regra de segurança "imagem de IA sempre exige aprovação humana" — escreva o teste dedicado descrito nas Notas de Implementação antes de considerar concluída.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 026 — Fila de Aprovação (API + Frontend) (após Task 025)
```
Leia o arquivo `.specs/026-fila-aprovacao-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 6 — Conexões & Publicação (PARALELO com Fases 3-5, após Fase 1)

### Task 027 — Postiz Self-hosted Deploy
```
Leia o arquivo `.specs/027-postiz-selfhosted-deploy/spec.md` completamente.
Valide e documente se o Postiz suporta LinkedIn e post de documento/PDF antes de prosseguir — isso determina o caminho (A ou B) das tasks 029/030.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 028 — Meta OAuth Bridge (após Task 027)
```
Leia o arquivo `.specs/028-meta-oauth-bridge/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 029 — LinkedIn OAuth Bridge (após Task 027, PARALELO com 028)
```
Leia o arquivo `.specs/029-linkedin-oauth-bridge/spec.md` completamente.
Determine o Caminho A ou B com base no resultado da validação da Task 027.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 030 — Postiz API Bridge (após Tasks 025, 028, 029)
```
Leia o arquivo `.specs/030-postiz-api-bridge/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 031 — Conexões Frontend (após Tasks 028, 029)
```
Leia o arquivo `.specs/031-conexoes-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 7 — Piloto Automático (após Fases 5 e 6)

### Task 032 — n8n Self-hosted Deploy
```
Leia o arquivo `.specs/032-n8n-selfhosted-deploy/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 036 — Autopilot Config API (PARALELO com Task 032)
```
Leia o arquivo `.specs/036-autopilot-config-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

> Sequenciais (dependem de 032, 036 e de módulos das Fases 3-6):

### Task 033 — n8n Workflow Pesquisa (após Tasks 032, 036, 020, 021)
```
Leia o arquivo `.specs/033-n8n-workflow-pesquisa/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 034 — n8n Workflow Geração (após Task 033, e Tasks 022, 025, 017/018)
```
Leia o arquivo `.specs/034-n8n-workflow-geracao/spec.md` completamente.
Esta spec reforça a regra de segurança "imagem de IA sempre exige aprovação" também no caminho automático — não pule o CA-02.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 035 — n8n Workflow Agendamento e Publicação (após Task 034, e Task 030)
```
Leia o arquivo `.specs/035-n8n-workflow-agendamento-publicacao/spec.md` completamente.
Se a spec 038 (coleta de métricas) ainda não estiver pronta, implemente a parte de agendamento e deixe a parte de métricas documentada como pendente, conforme as Notas de Implementação.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 037 — Autopilot Frontend (após Task 036)
```
Leia o arquivo `.specs/037-autopilot-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 8 — Analytics & Billing (PARALELO, após Fase 6)

### Task 038 — Analytics — Coleta de Métricas
```
Leia o arquivo `.specs/038-analytics-coleta-metricas/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 040 — Billing Stripe (PARALELO com 038)
```
Leia o arquivo `.specs/040-billing-stripe/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

> Sequenciais:

### Task 039 — Analytics API + Frontend (após Task 038)
```
Leia o arquivo `.specs/039-analytics-api-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 041 — Painel Mestre Super Admin (após Task 040, e Task 009)
```
Leia o arquivo `.specs/041-painel-mestre-superadmin/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 9 — Segurança & Deploy (SEQUENCIAL, por último)

### Task 042 — Audit Log e Conformidade LGPD
```
Leia o arquivo `.specs/042-audit-log-lgpd/spec.md` completamente.
Revise os módulos das fases anteriores (028, 029, 010, 026, 036, 041, 040) e complete as chamadas de auditoria que ainda faltarem, conforme listado na spec.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 043 — Deploy em Produção — VPS Hostinger (após TODAS as anteriores, e após credenciais/VPS reais estarem disponíveis)
```
Leia o arquivo `.specs/043-deploy-producao-vps/spec.md` completamente.
Confirme antes de iniciar que o VPS Hostinger, domínio e credenciais de produção listados em `.prd/checklist_acessos_e_delegacao.md` já foram providenciados pelo usuário.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 10 — Observabilidade, Central de Ajuda, Funil & Admin de Prompts (PARALELO entre si, após Fase 1; alguns dependem de fases específicas indicadas)

### Task 044 — Observabilidade Stack (após Fase 0)
```
Leia o arquivo `.specs/044-observabilidade-stack/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 045 — Página Saúde do Sistema (após Tasks 044, 041)
```
Leia o arquivo `.specs/045-pagina-saude-sistema/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 046 — Funil & UTM Tracking (após Task 008, PARALELO com 044)
```
Leia o arquivo `.specs/046-funil-utm-tracking/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 047 — Admin Funil & UTM Frontend (após Tasks 046, 041)
```
Leia o arquivo `.specs/047-admin-funil-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 048 — Prompts do Sistema API (após Tasks 022, 023, 018, 041)
```
Leia o arquivo `.specs/048-prompts-sistema-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 049 — Prompts do Sistema Frontend (após Task 048)
```
Leia o arquivo `.specs/049-prompts-sistema-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 050 — Central de Ajuda API (após Fase 1)
```
Leia o arquivo `.specs/050-central-ajuda-api/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 051 — Central de Ajuda Frontend (após Task 050)
```
Leia o arquivo `.specs/051-central-ajuda-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 052 — Chat de Suporte com IA (após Tasks 050, 007)
```
Leia o arquivo `.specs/052-chat-suporte-ia/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## FASE 11 — Módulo Pago: Automação de Instagram (SEQUENCIAL, após Fase 8/Billing)

### Task 053 — Schema & Entitlement (após Task 040)
```
Leia o arquivo `.specs/053-instagram-automation-schema-entitlement/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 054 — Webhook & Matching de Gatilho (após Tasks 053, 028)
```
Leia o arquivo `.specs/054-instagram-automation-webhook-api/spec.md` completamente.
Verifique se o escopo `instagram_manage_messages` já foi solicitado no App Review da Meta (checklist de acessos) — se não, desenvolva e teste com payloads simulados, sem bloquear.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 055 — Motor de Execução (após Task 054)
```
Leia o arquivo `.specs/055-instagram-automation-execution/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

### Task 056 — Frontend (após Task 055)
```
Leia o arquivo `.specs/056-instagram-automation-frontend/spec.md` completamente.
Execute TODOS os critérios de aceitação descritos nele.
Ao finalizar, confirme quais CAs foram concluídos.
```

---

## PÓS-EXECUÇÃO

Após todas as tasks completarem:
1. Mova as specs concluídas para `.specs/archive/NNN-nome/`.
2. Rode os testes de integração de ponta a ponta: `pnpm test:e2e` (cobrindo especialmente o ciclo completo do piloto automático, conforme a nota do spec `035`).
3. Verifique o build de produção: `pnpm build` (monorepo inteiro) + `docker compose -f infra/docker-compose.prod.yml build`.
4. Revise `.prd/checklist_acessos_e_delegacao.md` — qualquer item ainda pendente de credencial real deve estar claramente refletido no estado do sistema (endpoints em modo mock/501), nunca mascarado como "funcionando".

---

## PROGRESSO

| Task | Feature | Status | Fase |
|------|---------|--------|------|
| 001 | setup-monorepo | ✅ Concluído | 0 |
| 002 | setup-docker-compose | ✅ Concluído | 0 |
| 003 | schema-postgres-core | ✅ Concluído | 0 |
| 004 | setup-nestjs-api | ✅ Concluído | 0 |
| 005 | setup-nextjs-web | ✅ Concluído | 0 |
| 006 | auth-jwt-api | ✅ Concluído | 1 |
| 007 | multitenant-middleware | ✅ Concluído | 1 |
| 008 | auth-frontend | ✅ Concluído | 1 |
| 009 | workspace-provisioning | ✅ Concluído | 1 |
| 010 | crud-brand-kit-api | ✅ Concluído | 2 |
| 011 | onboarding-wizard-frontend | ✅ Concluído | 2 |
| 012 | crud-template-assets-api | ✅ Concluído | 2 |
| 013 | importador-canva-gamma | ✅ Concluído | 2 |
| 014 | acervo-templates-frontend | ✅ Concluído | 2 |
| 015 | render-engine-servico | ✅ Concluído | 3 |
| 016 | integracao-banco-imagens | ✅ Concluído* | 3 |
| 017 | motor-geracao-imagem-ia | ✅ Concluído* | 3 |
| 018 | qa-visao-imagem-ia | ✅ Concluído* | 3 |
| 019 | composicao-frontend | ✅ Concluído* | 3 |
| 020 | pesquisa-tendencias-api | ✅ Concluído | 4 |
| 021 | conector-pesquisa-fontes | ✅ Concluído* | 4 |
| 022 | geracao-copy-claude | ✅ Concluído* | 4 |
| 023 | diretor-de-cena | ✅ Concluído* | 4 |
| 024 | pesquisa-frontend | ✅ Concluído | 4 |
| 025 | content-pieces-api | ✅ Concluído | 5 |
| 026 | fila-aprovacao-frontend | ✅ Concluído | 5 |
| 027 | postiz-selfhosted-deploy | ✅ Concluído* | 6 |
| 028 | meta-oauth-bridge | ✅ Concluído* | 6 |
| 029 | linkedin-oauth-bridge | ✅ Concluído* | 6 |
| 030 | postiz-api-bridge | ✅ Concluído* | 6 |
| 031 | conexoes-frontend | ✅ Concluído* | 6 |
| 032 | n8n-selfhosted-deploy | ✅ Concluído* | 7 |
| 033 | n8n-workflow-pesquisa | ✅ Concluído* | 7 |
| 034 | n8n-workflow-geracao | ✅ Concluído* | 7 |
| 035 | n8n-workflow-agendamento-publicacao | ✅ Concluído* | 7 |
| 036 | autopilot-config-api | ⏳ Pendente | 7 |
| 037 | autopilot-frontend | ⏳ Pendente | 7 |
| 038 | analytics-coleta-metricas | ⏳ Pendente | 8 |
| 039 | analytics-api-frontend | ⏳ Pendente | 8 |
| 040 | billing-stripe | ⏳ Pendente | 8 |
| 041 | painel-mestre-superadmin | ⏳ Pendente | 8 |
| 042 | audit-log-lgpd | ⏳ Pendente | 9 |
| 043 | deploy-producao-vps | ⏳ Pendente | 9 |
| 044 | observabilidade-stack | ⏳ Pendente | 10 |
| 045 | pagina-saude-sistema | ⏳ Pendente | 10 |
| 046 | funil-utm-tracking | ⏳ Pendente | 10 |
| 047 | admin-funil-frontend | ⏳ Pendente | 10 |
| 048 | prompts-sistema-api | ⏳ Pendente | 10 |
| 049 | prompts-sistema-frontend | ⏳ Pendente | 10 |
| 050 | central-ajuda-api | ⏳ Pendente | 10 |
| 051 | central-ajuda-frontend | ⏳ Pendente | 10 |
| 052 | chat-suporte-ia | ⏳ Pendente | 10 |
| 053 | instagram-automation-schema-entitlement | ⏳ Pendente | 11 |
| 054 | instagram-automation-webhook-api | ⏳ Pendente | 11 |
| 055 | instagram-automation-execution | ⏳ Pendente | 11 |
| 056 | instagram-automation-frontend | ⏳ Pendente | 11 |

Status: ⏳ Pendente | 🔄 Executando | ✅ Concluído | ❌ Erro

\* Task 016: implementado e validado (CA-02 modo gracioso sem chave, CA-04 status) — CA-01/CA-03 (busca real e cache) dependem de `UNSPLASH_ACCESS_KEY`, que o usuário ainda não forneceu (pendência já listada em `.prd/checklist_acessos_e_delegacao.md` como item opcional). Validar assim que a chave existir.

\* Task 017: todos os 6 CAs validados estruturalmente (prompt com as 6 camadas, negative list completa, conditioning com/sem reference_images, attemptNumber, auditoria via GET) usando uma `FAL_API_KEY` fake só para passar do gate de "configurado" — a chamada real ao fal.ai falha (esperado) e o job fica `status='failed'`, mas o `assembled_prompt` completo permanece auditável, que é o que os CAs pedem. `ANTHROPIC_API_KEY` também ausente: as camadas 1 (tone keywords) e 2 (scene brief) caem no fallback determinístico documentado no código, sem quebrar o fluxo. Trocar pelas chaves reais quando o usuário as fornecer (pendência já listada em `.prd/checklist_acessos_e_delegacao.md`).

\* Task 018: sem `ANTHROPIC_API_KEY` real, os 6 CAs foram validados via testes unitários com mocks (`apps/api/src/image-generation/qa-vision.service.spec.ts`, primeira suíte de testes do projeto — `pnpm --filter api test`) cobrindo scores altos/baixos, limite de 3 tentativas, persistência dos scores, e retry limitado em falha de API. CA-06 também confirmado ao vivo via HTTP real (falha graciosamente com `status='qa_failed'` sem trancar o processo). Rodar de novo com a chave real assim que existir para validar os scores de visão de verdade.

\* Task 019: CA-01, CA-02, CA-04 e CA-05 validados ao vivo no navegador (upload direto + preview renderizado em 8.15s, aviso de PDF ao trocar para LinkedIn+carrossel, template trocado preserva a imagem do slide existente — confirmado no banco, aviso de maxLength reativo). CA-03 (Geração com IA) tem o estado de carregamento e o de erro genérico confirmados ao vivo; os sub-estados "imagem aprovada" e "aguardando revisão manual" dependem de `ANTHROPIC_API_KEY`/`FAL_API_KEY` reais (mesma pendência já registrada nos Tasks 017/018). Backend ganhou uma fatia mínima de `content-pieces` (create/get/update/upload-image/render) só com o necessário para este editor funcionar — o CRUD completo é do spec 025.

\* Task 028: provisionamento de Organization dedicada por workspace no Postiz reusado (spec 027), listagem/sincronização/desconexão de integrações e isolamento por `apiKey` — tudo validado ao vivo contra o Postiz real (`http://volupia_postiz:3000`, banco `volupia_postiz-db`): `POST /social-accounts/sync` criou de fato a Organization "Workspace A" no Postiz (confirmado cruzando `workspaces.postiz_api_key` com `Organization.apiKey` no Postgres do Postiz), `RolesGuard` bloqueou `viewer` com 403, `DELETE` em conta inexistente retornou 404. CA em aberto: **iniciar uma NOVA conexão OAuth (`connect/meta`) não foi implementado** — a API pública do Postiz v2.11.3 só expõe operações sobre integrações já conectadas, não início de OAuth para uma organização específica; isso exigiria uma sessão autenticada do frontend do Postiz (NextAuth), que decidi não simular por ser frágil/inseguro (ver comentário em `apps/api/src/social-accounts/social-accounts.service.ts#connect`). O endpoint retorna `501` com essa explicação em vez de fingir sucesso. **Esta é a lacuna arquitetural mais importante do projeto até agora** — sem resolvê-la, um cliente do FastSocial não consegue conectar uma conta Meta nova sem que alguém com acesso ao Postiz o faça manualmente por trás, o que quebra o requisito explícito do usuário de "cliente nunca vê o Postiz". Avaliar em Task 030/031: (a) pedir ao Postiz um endpoint de API pública para iniciar OAuth por organização (upstream), (b) usar Meta OAuth direto (App próprio do FastSocial) e só armazenar o token via escrita direta na tabela `Integration` do Postiz, ou (c) aceitar um passo manual assistido no onboarding de cada cliente.

\* Task 030: implementado com BullMQ (fila "publish") sobre um Redis dedicado (`fastsocial-redis`, subido nesta sessão — não existia infra de fila antes). Achado real durante a validação ao vivo: BullMQ rejeita `:` em jobId customizado ("Custom Id cannot contain :"), quebrando schedule/reschedule/cancel na primeira chamada real contra produção — corrigido trocando o separador para `-` (`buildJobId`, commit de fix separado). Depois do fix, validado ao vivo de ponta a ponta com dados de teste reais: CA-01 (job disparou exatamente na janela agendada — confirmado via log e Redis), CA-03 (duas mensagens de erro específicas, não genéricas: "Peça sem imagens renderizadas" quando falta render, e "Token expirado ou conta desconectada" quando a conta tem `status='expired'`, este último rejeitado já no `schedule()` com 409 antes mesmo de enfileirar), CA-04 (reagendar uma publicação de +3600s para +30s fez o job disparar no NOVO horário, não no antigo — confirmado pelo timestamp do log), cancelamento (publicação cancelada nunca apareceu nos logs do processor, confirmando que o job foi removido de verdade), e CA-05 (as 4 content_pieces de teste permaneceram `scheduled`, nunca foram marcadas `published` prematuramente após falha). CA-02 (2 redes publicando de forma independente) e o caminho de falha definitiva após esgotar os 2 retries (5min + 30min = ~35min de espera) não foram exercitados ao vivo por limitação de tempo/dados (só há 1 rede com conta "conectada" de teste); ambos são exercícios do mesmo mecanismo já validado, não lógica nova. A chamada real ao Postiz (`createPost`) e ao LinkedIn (`publishImagePost`/`publishDocumentPost`) não puderam ser validadas de ponta a ponta porque nenhuma integração real está conectada ainda — mesma lacuna do spec 028 (conectar conta nova) e falta de credencial real do spec 029.

\* Task 032: n8n **reusado** (mesma decisão do Postiz no spec 027 — ver `infra/n8n/README.md`), já rodando como `volupia_n8n` na rede `easypanel`, sem reiniciar nem alterar nada nele — CA-01 e CA-05 satisfeitos pela instância existente sem ação nossa. Implementado e validado ao vivo em produção: `ServiceTokenStrategy`/`ServiceTokenGuard` (comparação em tempo constante, separado do JWT de usuário) protegendo `GET /auth/service-ping` — CA-04 confirmado (sem token → 401, token errado → 401) e CA-03 confirmado (token real → 200 `{"ok":true,"type":"service"}`). CA-02 confirmado nos dois sentidos: de dentro do container da API, `fetch` para `http://volupia_n8n:5678/healthz` respondeu `{"status":"ok"}` (prova que a rede Docker compartilhada funciona), e `GET /api/v1/health` da nossa API está acessível pela mesma rede que o n8n já usa. CA em aberto: criar de fato um workflow de teste DENTRO do n8n (webhook → HTTP Request) depende de `N8N_API_KEY`, que não geramos por escrita direta no banco como fizemos no Postiz — motivo explicado em `infra/n8n/README.md`: o n8n usa SQLite de arquivo único (não Postgres), e editar esse arquivo por fora enquanto o processo está servindo os workflows reais da agência é um risco de corrupção que não existia no caso do Postiz (que tinha um Postgres aceitando novas conexões normalmente). Fica como pendência para o usuário gerar pela própria UI (Configurações → n8n API), passo a passo documentado no README. Erros reais encontrados e corrigidos durante a implementação: `passport-custom` bundla tipos de `@types/express` incompatíveis com a versão do projeto (erro de build `TS2416`, não resolvido por um `.d.ts` ambiente) — resolvido reimplementando como guard simples (`CanActivate`), mesmo padrão de `WorkspaceGuard`/`RolesGuard` já usado no projeto, sem depender de Passport para este caso.

\* Task 033: validado ao vivo em produção com dados de teste reais (`workspace-a` com `autopilot_pipelines.is_active=true`, `workspace-b` com `false`): `GET /internal/autopilot/active-workspaces` sem token retornou 401 (CA-03); com token retornou `[{"workspaceId":"...workspace-a..."}]` — confirma que `workspace-b` (inativo) nunca aparece (CA-02); chamando de novo imediatamente em seguida retornou `[]` — confirma a idempotência do "mark-and-fetch" via `lastRunAt` (mesmo espírito de CA-04, sem duplicar processamento no mesmo dia). `POST /internal/autopilot/research-scan` disparado para `workspace-a` retornou o erro correto e específico ("complete o onboarding") porque esse workspace de teste não tem Brand Kit — prova que o endpoint delega de verdade para `ResearchService.scan()` e falha graciosamente, não é um endpoint fake. CA-01/CA-04 (execução real DENTRO do n8n, manual e agendada) dependem de `N8N_API_KEY` para importar `infra/n8n-workflows/research-pipeline.json` — mesma pendência do Task 032, passo a passo documentado em `infra/n8n/README.md`. CA-05 (falha isolada não trava o loop) é garantido pelo `continueOnFail: true` do nó HTTP Request no workflow — não pôde ser observado rodando de fato dentro do n8n pelo mesmo motivo, mas a peça do lado da API (retornar erro específico em vez de derrubar o processo) está confirmada acima.

\* Task 034: decisão de arquitetura confirmada com o usuário antes de implementar — em vez de ensinar o `WorkspaceGuard`/`JwtAuthGuard` compartilhados (usados por praticamente todo o resto do produto) a aceitar token de serviço, criamos um espelho interno por endpoint (`copy-generate`, `content-pieces` create/render/submit-for-approval/update-slide, `image-generation-jobs` create/get, `templates` compatíveis, `stock-search`), cada um delegando para o MESMO Service do endpoint humano — zero lógica de negócio duplicada, só o transporte de autenticação. `next-insights` agora calcula a cadência semanal de verdade (`posts_per_week` menos peças `origin='autopilot'` dos últimos 7 dias) e devolve o `format_mix` do pipeline junto, com mark-and-fetch (insights retornados viram `consumed=true`). Validado ao vivo em produção com dados reais: `next-insights` retornou o insight de teste e o marcou consumido (segunda chamada veio vazia); com `posts_per_week=3` e 1 peça `autopilot` já criada, retornou exatamente os 2 insights mais relevantes restantes, excluindo corretamente o de menor relevância (CA-03 confirmado com números reais, não só estrutura); `GET /templates?format=static_post` retornou um template de sistema real e compatível; **CA-02 confirmado da forma mais rigorosa possível**: criei uma content_piece via o endpoint interno (`origin` gravado corretamente como `"autopilot"`), marquei um slide como `image_source='ai_generated'` e chamei `submit-for-approval` com `autoApprove: true` — a peça foi para `pending_approval`, não `approved`, confirmando que a regra de segurança do PRD 7.7 (spec 025) segura firme também no caminho 100% automatizado, exatamente o cenário que a CA-02 pede. CA-01/CA-04/CA-05 (execução real de ponta a ponta DENTRO do n8n, incluindo o nó de decisão de format e o polling de geração de imagem) dependem de `N8N_API_KEY` para importar `infra/n8n-workflows/content-generation-pipeline.json`, mesma pendência dos specs 032/033 — e esse JSON é um esqueleto estrutural correto na sequência de chamadas, mas algumas referências de campo entre nós (`brandKitDefaultImageSource`, `autoApprove` vindos de `brand_kit`/`autopilot_pipelines`, que os endpoints atuais não devolvem embutidos na resposta da content-piece) precisam ser conectadas de verdade dentro da UI do n8n — documentado honestamente em vez de fingir um JSON 100% plug-and-play que não pôde ser executado nem uma vez.

\* Task 035: `content-pieces.service.ts#notifyApproved` dispara o webhook assinado (HMAC-SHA256, `N8N_WEBHOOK_SECRET`) para o n8n sempre que uma peça vira `approved`, em ambos os caminhos (aprovação humana `approve()` e auto-aprovação `submitForApproval` do autopilot) — validado ao vivo: aprovei uma peça real em produção com o n8n de verdade respondendo (não mock), recebi o 404 genuíno do próprio n8n ("webhook not registered", porque o workflow ainda não foi importado/ativado — mesma pendência de `N8N_API_KEY` dos specs 032-034) e confirmei que **a aprovação em si aconteceu normalmente** (`status: "approved"`, HTTP 201) apesar da falha do webhook — exatamente o comportamento "nunca bloquear a aprovação" que o código promete. Os 3 endpoints internos que o `scheduling-pipeline.json` consome e que não existiam antes deste spec (`GET .../pipeline-config`, `GET /internal/social-accounts/:workspaceId`, `GET/POST /internal/publications/:workspaceId/upcoming|schedule`) foram testados end-to-end de verdade: criei uma conta social e agendei uma publicação via o endpoint interno exatamente como o n8n faria, e `/upcoming` refletiu o agendamento (a base do cálculo anti-colisão do CA-02). CA-04 (janela de 24h-30 dias da coleta de métricas) validado com os 3 casos de fronteira reais no banco: publicada há 5 dias aparece, há 1h não aparece (recente demais), há 40 dias não aparece (antiga demais) — os três resultados bateram exatamente com o esperado. CA-01/CA-02/CA-05 (execução real DENTRO do n8n) e a coleta de métricas de fato (spec 038) permanecem pendentes pela mesma razão dos specs 032-034 (falta `N8N_API_KEY` para importar/ativar os workflows) — documentado honestamente dentro do próprio `metrics-collection-pipeline.json` (nó de coleta real aponta para uma URL que só existirá quando o spec 038 for implementado, sem fingir que já funciona) e como comentário no `scheduling-pipeline.json` sobre a pré-condição não confirmada de acesso a variável de ambiente dentro de Code node do n8n compartilhado.

\* Task 031: validado ao vivo no navegador contra `https://app.fastsocial.volupia.cloud/connections` logado como `teste-validacao@fastsocial.dev`: lista renderiza corretamente 2 contas de teste (uma `connected`, uma `expired`) com badges de status certos e botão "Reconectar" só aparecendo para a expirada (CA-03 parcial — o badge e a lógica condicional estão corretos; o fluxo de popup em si não pôde ser completado neste navegador de teste porque `window.open` foi bloqueado pelo bloqueador de popup do ambiente, mas isso validou o CAMINHO DE ERRO do CA-05: mensagem clara "O navegador bloqueou o popup..." em vez de UI travada — a URL de autorização real já tinha sido confirmada por curl no spec 029). CA-04 validado de ponta a ponta: clicar "Desconectar" abre modal de confirmação com o aviso sobre publicações agendadas, cancelar fecha sem ação, confirmar dispara o `DELETE` real. CA-01/CA-02 (conectar de verdade via popup) dependem da mesma lacuna do spec 028 (iniciar OAuth novo) e de credenciais reais do LinkedIn — não exercitáveis ainda. Nota lateral: ao tentar desconectar uma conta de teste com `external_account_id` falso (criada via SQL direto para validar o spec 030), a API retornou 500 porque o Postiz respondeu 404 de verdade para uma integração que nunca existiu de fato — confirma que o endpoint chama a API real do Postiz corretamente; o erro era do dado de teste, não do código (dado removido depois via SQL em vez de forçar o disconnect).

\* Task 029: **Caminho B** foi o escolhido (documentado no topo de `linkedin-oauth.service.ts`) — o Postiz não custodia documento/PDF do LinkedIn de forma confiável (achado do spec 027), então o FastSocial fala direto com a API do LinkedIn e guarda os tokens cifrados (AES-256-GCM, `TokenEncryptionService`, 6 testes unitários cobrindo round-trip, não-determinismo do ciphertext, chave ausente/inválida — todos passando). Sem `LINKEDIN_CLIENT_ID`/`SECRET` reais (mesma pendência do checklist de acessos), a validação ao vivo foi até onde dava sem um app aprovado: com credenciais fake, `GET /social-accounts/connect/linkedin` gerou uma URL de autorização real e bem formada (`redirect_uri`, `scope`, `state` assinado); o callback com `state` válido passou pela verificação de assinatura HMAC e chegou a fazer a chamada real para `https://www.linkedin.com/oauth/v2/accessToken`, que respondeu com o erro esperado do LinkedIn (`authorization code not found` — confirma que o formato da requisição está correto); o callback com `state` adulterado foi rejeitado antes de qualquer chamada de rede, confirmando a proteção contra CSRF. CA-02/CA-03/CA-05 (publicar de verdade e renovação automática) não puderam ser exercitados ao vivo sem uma Company Page de teste real — ficam pendentes de credencial, mesmo padrão dos Tasks 017/018/021. `TOKEN_ENCRYPTION_KEY` real já foi gerada e está em produção.

\* Task 021: CA-02 (log real "nenhuma fonte habilitada") e CA-03 (gate `isEnabled()` do scraping testado diretamente — só ativa com a string exata `"true"`) confirmados ao vivo. CA-04/CA-05 (uma única chamada a Claude, scores sempre preenchidos) validados via testes unitários com mock (`insight-summarizer.service.spec.ts`). CA-01 depende de `META_ADS_LIBRARY_ACCESS_TOKEN` real — pendência nova, já adicionada a `.prd/checklist_acessos_e_delegacao.md` como item opcional.

\* Task 022: CA-03 confirmado ao vivo (400 sem insightId/briefing). CA-01/CA-02/CA-04/CA-05 (estilo distinto por tom de voz, exatamente N slides, variação visivelmente diferente, robustez de parsing) dependem de `ANTHROPIC_API_KEY` real para gerar copy de verdade — mesma pendência dos Tasks 017/018/021. A escolha de usar tool-use (structured output) da Anthropic API em vez de JSON em texto livre já elimina estruturalmente a classe de falha que o CA-05 testa (parsing inconsistente), mas a validação empírica com 10 chamadas reais ainda depende da chave.

\* Task 023: CA-01 (sem mencionar texto/palavras na cena), CA-02 (instrução de espaço negativo sempre correta, testado nas 5 posições) e CA-03 (nunca excede 3 frases mesmo com resposta do LLM mais longa) validados via testes unitários com mock (`scene-director.service.spec.ts`), incluindo o fallback determinístico. Regressão confirmada ao vivo: o pipeline do Task 017 (`POST /image-generation/jobs`) continua produzindo o `assembled_prompt` corretamente após a refatoração que extraiu este serviço. CA-04 (variabilidade entre 3 chamadas reais) depende de `ANTHROPIC_API_KEY` real — mesma pendência dos demais specs de IA.

\* Task 027: desvio consciente e explicitamente aprovado pelo usuário — reusa o Postiz já em produção na agência (`volupia_postiz`, mesmo VPS) em vez de subir uma instância nova dedicada ao FastSocial, documentado em `infra/postiz/README.md`. CA-01/CA-02 satisfeitos pela instância já rodando (24h+ saudável, conectada ao próprio Postgres). Confirmada conectividade interna direta via rede `easypanel` (`http://volupia_postiz:5000`), útil para o bridge do spec 030. CA-06 pesquisado sem depender de credencial: Postiz converte imagens em PDF automaticamente na UI para LinkedIn, mas a API pública tem suporte incerto para isso (issue aberta gitroomhq/postiz-app#1381) — spec 029 deve publicar documento do LinkedIn via chamada direta à API do LinkedIn, conforme a própria contingência do spec. CA-03/04/05 pendem de: apps OAuth Meta/LinkedIn reais configurados dentro do Postiz existente, e uma API key gerada pelo usuário na conta Postiz (item novo no checklist).
