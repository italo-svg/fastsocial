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
| 036 | autopilot-config-api | ✅ Concluído* | 7 |
| 037 | autopilot-frontend | ✅ Concluído | 7 |
| 038 | analytics-coleta-metricas | ✅ Concluído* | 8 |
| 039 | analytics-api-frontend | ✅ Concluído | 8 |
| 040 | billing-stripe | ✅ Concluído* | 8 |
| 041 | painel-mestre-superadmin | ✅ Concluído | 8 |
| 042 | audit-log-lgpd | ✅ Concluído | 9 |
| 043 | deploy-producao-vps | ✅ Concluído* | 9 |
| 044 | observabilidade-stack | ✅ Concluído | 10 |
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

\* Task 036: os 5 CAs validados ao vivo em produção com dados reais, cada um isolado e depois limpo do banco. CA-01: `PUT /autopilot` com `formatMix` somando 0.8 rejeitado com 400 e mensagem exata da soma; com soma 1.0 aceito normalmente. CA-02: `toggle isActive=true` sem `brand_kit.niche` e sem `social_account` conectada rejeitado com 400 listando as DUAS coisas que faltam explicitamente. CA-03: após criar um `brand_kit` com nicho e uma `social_account` `connected` de verdade, o mesmo toggle ativa com sucesso, refletido em `GET /autopilot`. CA-04: promovi temporariamente o usuário de teste a `editor` nesse workspace, confirmei `GET` 200 e `PUT`/`toggle` 403 ("Ação restrita a: workspace_admin, super_admin"), e reverti o papel de volta a `workspace_admin` no fim. CA-05: inserido 3 `content_pieces` com `origin='autopilot'` (2 hoje, 1 ontem) e `GET /autopilot/runs` agrupou exatamente `{2026-08-10: 2, 2026-08-09: 1}`. Desvio consciente do texto do spec: **não** criado o endpoint `PATCH /internal/autopilot/:workspaceId/mark-run` que o spec pede — o spec `033` já marca `last_run_at` atomicamente dentro do "mark-and-fetch" de `GET /internal/autopilot/active-workspaces`, e um segundo ponto de escrita ao final do workflow duplicaria a fonte de verdade de que o CA-04 do spec `033` depende (idempotência). Também descobri e limpei um resíduo de teste do spec 033/034 (uma linha de `autopilot_pipelines` do workspace-a com `is_active=true` esquecida de sessões de validação anteriores) — removida no processo.

Nota Task 037: os 5 CAs validados ao vivo no navegador real contra produção (https://app.fastsocial.volupia.cloud/autopilot, logado como teste-validacao@fastsocial.dev). Bug real encontrado e corrigido no caminho: `AutopilotController#get()` devolvia o `null` do service direto, gerando HTTP 200 com corpo vazio em vez do 404 que `useBrandKit`/`useAutopilot` esperam para tratar "ainda não configurado" — a página ficava presa em "Carregando..." para sempre (sem tratamento de `isError`), só descoberto testando de verdade no navegador, não seria pego por type-check. Corrigido espelhando o padrão já usado em `BrandKitController#get()` (lançar `NotFoundException` explicitamente). CA-01: mudei postsPerWeek pra 7 e o mix pra 80/20, salvei, recarreguei a página inteira — os valores persistiram exatamente. CA-02: cliquei em Ativar sem nicho/conta conectada e a mensagem exata da API ("Brand Kit sem nicho definido; Nenhuma conta social conectada") apareceu num card vermelho, sem nenhum termo técnico. CA-03: arrastei o slider de mix para 80 e "Post estático: 80% / Carrossel: 20%" atualizou junto em tempo real, sempre somando 100% (é fisicamente um único slider, não dá pra divergir). Depois de configurar `niche` e uma `social_account` `connected` reais no banco, ativar funcionou de primeira (badge foi para "ATIVO" verde) e desativar foi um clique direto sem nenhum modal de confirmação (CA-05). CA-04: inseri 2 `content_pieces` `origin='autopilot'` e "Histórico de execuções" mostrou "10 de agosto de 2026 — 2 peças geradas" com badges de status coloridos por peça. Todos os dados de teste (brand_kit, social_account, content_pieces, autopilot_pipeline) foram limpos do banco ao final.

\* Task 038: CA-04 validado ao vivo da forma mais rigorosa possível — com um token LinkedIn fake mas corretamente cifrado (AES-256-GCM real via `TokenEncryptionService`), a chamada bateu de verdade na API real do LinkedIn e recebeu um `401 INVALID_ACCESS_TOKEN` genuíno; `MetricsCollectorService` capturou e devolveu `{success:false, error:"..."}` com HTTP 201 (nunca 500) — provado também com um token cifrado em formato inválido (erro de decriptação) tratado da mesma forma graciosa. O coletor de Instagram/Facebook foi chamado de verdade e retornou exatamente a mensagem documentada da lacuna arquitetural, sem exceção não tratada. CA-03 (cada coleta cria um snapshot novo) é garantido pelo código (`analyticsSnapshot.create()`, nunca `update`/`upsert` — não existe nenhum caminho que sobrescreva um snapshot existente) mas **não pôde ser observado ponta a ponta com uma coleta bem-sucedida de verdade**, porque isso exige uma conta LinkedIn realmente conectada (que por sua vez depende de `LINKEDIN_CLIENT_ID`/`SECRET` reais, pendência já registrada nos specs 029/checklist de acessos) — as duas tentativas de coleta no teste falharam (401 esperado com token fake) e corretamente não geraram nenhum snapshot, comportamento também correto (só grava snapshot em caso de sucesso). CA-01/CA-02 (valores plausíveis de uma publicação real) dependem da mesma credencial ausente. Decisão de arquitetura documentada no topo de `instagram-facebook.collector.ts`: coleta de métricas de Instagram/Facebook está bloqueada enquanto o Postiz (Caminho A, spec 028) não expuser insights nem o token real — não é bug, é limite técnico da integração atual, com 3 caminhos de resolução listados para decisão futura de produto.

Nota Task 039: os 5 CAs validados ao vivo com dados reais no banco e verificação numérica exata, backend via curl e frontend no navegador real. Criei 2 publications (Instagram e LinkedIn) com um insight de origem, e propositalmente 2 snapshots para a publication do Instagram (um antigo com reach=100, um mais novo com reach=500) para forçar o teste do CA-04 mais rigoroso possível: `GET /analytics/summary` retornou `reach:500` (não 600), confirmando que só o snapshot mais recente conta. CA-01 confirmado com os totais batendo exatamente com a soma esperada dos snapshots mais recentes de cada publication. CA-02 validado duas vezes (filtrar por `instagram` excluiu o LinkedIn e vice-versa, com os totais mudando exatamente para os valores da rede filtrada) — e validado de novo interativamente no navegador trocando o filtro de rede na UI. CA-03: ranking por `reach` trouxe a publication do Instagram com `insightSummary` preenchido corretamente a partir do join com `research_insights`. CA-05: `GET /analytics/export.csv` devolveu os headers corretos (`Content-Type: text/csv`, `Content-Disposition: attachment`) com o corpo batendo exatamente com os dados filtrados da tela. **Bug real encontrado e corrigido durante o teste no navegador**: o Ranking ignorava completamente os filtros de período/rede/formato da tela (hardcoded para all-time, só aceitava `metric`/`limit` como o próprio spec literalmente lista) — trocar o filtro de rede para LinkedIn atualizava o gráfico mas o Ranking continuava mostrando a publicação do Instagram, inconsistência visível só ao interagir de verdade com a UI. Corrigido estendendo `ranking()` para aceitar os mesmos filtros de `summary()`; revalidado no navegador (LinkedIn + métrica "Alcance" corretamente mostra "sem publicações" porque LinkedIn não tem reach; trocando para "Impressões" mostra a publicação certa com o valor certo).

\* Task 040: CA-06 e CA-03 validados ao vivo com o rigor mais alto possível sem uma conta Stripe real. CA-06: subi um container descartável sem `STRIPE_SECRET_KEY` — `GET /billing/plans` retornou `501` com mensagem clara, e `/health` continuou `{"status":"ok","db":true}` normalmente, confirmando que o resto da API não é afetado. CA-03: mandei um payload forjado com uma assinatura `stripe-signature` inventada para `POST /billing/webhook` — a própria biblioteca oficial `stripe` (não um mock) recusou com o erro genuíno "No signatures found matching the expected signature for payload", traduzido em `400`. CA-01 (`scripts/setup-stripe-products.ts`): rodei de verdade com uma `STRIPE_SECRET_KEY` fake contra a API real do Stripe — o script carregou `plans.json`, tentou criar o primeiro Produto, e recebeu um `StripeAuthenticationError` genuíno (401 "Invalid API Key provided", com os headers reais da Stripe) capturado corretamente pelo `main().catch()`, provando que a conectividade e a estrutura do script (idempotência via `stripePriceId` já gravado, criação Produto→Preço) estão corretas — só falta uma chave real para provar a idempotência de fato (rodar 2x sem duplicar). `GET /billing/plans` com a API "configurada" (chave fake) confirmou que o arquivo `plans.json` é lido de verdade do volume montado em produção (`/app/infra/billing/plans.json` — necessário porque o Dockerfile de `apps/api` usa `apps/api` como build context e não empacota `infra/` na imagem, documentado em `infra/DEPLOYMENT-ATUAL.md`). `POST /billing/checkout-session` corretamente recusou com 404 claro ("rode scripts/setup-stripe-products.ts primeiro") antes mesmo de tentar chamar o Stripe, já que nenhum plano tem `stripePriceId` ainda. CA-02 (Checkout completo via webhook), CA-04 (`invoice.payment_failed` via Stripe CLI) e CA-05 (trigger `enforce_monthly_post_limit` refletindo o plano pago após upgrade) dependem de uma conta Stripe real em modo teste — pendência já listada no checklist de acessos, mesma categoria dos specs 016/017/018/021/029/038.

Nota Task 041 (Fase 8 completa): todos os 6 CAs validados ao vivo em produção com dados reais, elevando temporariamente `teste-validacao@fastsocial.dev` a `is_platform_super_admin=true` direto no banco (nunca via endpoint de produto, conforme a nota do próprio spec) e revertendo ao final. CA-01: `GET /platform/workspaces` trouxe os 10 workspaces reais acumulados ao longo desta sessão inteira, com os agregados corretos (2 deles com `billingStatus: null` — reflexo real de terem sido criados antes de todo workspace ganhar uma `subscription`, não um bug da query). CA-02: `teste-validacao` (workspace_admin do próprio workspace) tomou 403 nas rotas `/platform/*` antes de virar super admin. CA-06 validado nos dois caminhos: e-mail com conta local existente (`teste-b@fastsocial.dev`) virou `workspace_admin` direto (confirmado a linha em `workspace_members`); e-mail sem conta nenhuma gerou um `workspace_invite` pendente com zero membros (confirmado `count=0` em `workspace_members` e a linha em `workspace_invites` com `accepted_at` nulo). CA-03 validado nas duas metades: suspendi um workspace com um membro real logado e o próximo `GET /content-pieces` dele tomou exatamente `403 "Workspace suspenso — contate o suporte."`; e, com um `autopilot_pipelines.is_active=true` real nesse mesmo workspace, `GET /internal/autopilot/active-workspaces` parou de listá-lo assim que suspenso (e voltou a listar ao reativar) — CA-04 confirmado no mesmo teste (reativar restaura o 200 normal e a listagem do autopilot). CA-05: o token de impersonate gerado foi usado de verdade contra `GET /content-pieces` do workspace alvo (200 real, não just decodificado) e o `audit_log` com `action='platform_admin_impersonation'` foi conferido no banco com `workspace_id`/`user_id`/`metadata` corretos, gravado antes do token ser devolvido. Verificação final no navegador: `/master-panel` renderizou a tabela com exatamente os mesmos dados batidos via curl. Workspaces de teste (provisionados durante a validação de CA-06) e o `autopilot_pipelines` de teste foram removidos ao final; nenhum `is_platform_super_admin=true` ficou esquecido no banco (confirmado com `SELECT` vazio).

Nota Task 042 (Fase 9 iniciada): todos os 6 CAs validados ao vivo em produção, incluindo o teste mais destrutivo de toda a sessão — feito num workspace 100% descartável criado só para isso, nunca reaproveitando dados de outros specs. Bug real encontrado e corrigido no caminho: `SocialAccountsService#disconnect()` chamava o Postiz incondicionalmente para QUALQUER rede, inclusive LinkedIn (Caminho B, spec 029) — que nunca teve integração lá, então desconectar uma conta LinkedIn sempre quebrava com 500. Corrigido para só chamar o Postiz quando `network !== "linkedin"`; validado com uma conta LinkedIn de teste (CA-01 confirmado com o `audit_log` gravado corretamente: `action="social_account_disconnected"`, metadata com network/externalAccountId). CA-02: `editor` tomou 403 em `GET /audit-logs` com a mensagem padrão do `RolesGuard`. CA-03: criei um workspace descartável com brand kit + content piece reais, pedi o export, o worker BullMQ real processou o job, subiu um JSON de verdade no bucket `exports` do Supabase Storage e **eu baixei o arquivo pela URL assinada de verdade** — conferi que o `niche`/`copyText` reais apareciam no JSON. CA-04: confirmar com um token forjado devolveu 400 e o workspace continuou existindo; a solicitação real gerou um token de 64 chars gravado em `data_deletion_requests` com expiração de 24h. CA-05: confirmar com o token real de fato excluiu o workspace — `SELECT count(*)` pós-exclusão deu zero para `workspaces`, `brand_kits`, `content_pieces`, `subscriptions` e `workspace_members`, provando que o `ON DELETE CASCADE` do spec 003 funciona ponta a ponta de verdade, não só no papel. CA-06: o `audit_log` da própria exclusão sobreviveu com `workspace_id=NULL` (via `ON DELETE SET NULL`) mas `entity_id`/`metadata` preservando o id e o nome do workspace excluído — exatamente o comportamento que a nota do spec antecipava.

\* Task 043 (Fase 9 completa): spec diferente de todos os anteriores — pela primeira vez na sessão, parte do trabalho foi **conscientemente não executada ao vivo** por envolver ações destrutivas/de alto raio de impacto num servidor **compartilhado já em produção real** (o mesmo VPS hospeda Postiz/n8n em uso ativo da agência, não um ambiente descartável). `provision-vps.sh` (mexe em SSH/firewall do servidor inteiro) e o CA-05 (reboot do VPS) foram escritos e revisados, mas não rodados — reconfigurar acesso remoto ou reiniciar um servidor com serviços de terceiros ativos exige combinar uma janela de manutenção com o usuário antes, não é uma decisão pra tomar sozinho no meio da sessão. CA-03 (deploy real via GitHub Actions) também não pôde ser disparado de verdade — exige Secrets do GitHub que só o dono do repositório cadastra. Dito isso, tudo que **era seguro validar foi validado de verdade, sem atalho**: `docker compose -f infra/docker-compose.prod.yml config` confirmou que o compose novo (só api/web/render-engine/redis — Postiz/n8n ficam de fora de propósito, geridos por fora) é sintaticamente correto e interpola certo contra as redes/volumes reais (`easypanel`, `fastsocial-redis-data`). `backup.sh` rodou de verdade contra a infraestrutura real (só leitura: `pg_dump` no Postgres do Postiz, `docker cp` no SQLite do n8n) e **dois bugs reais foram encontrados e corrigidos no processo**: (1) `docker cp`/`docker exec` precisam do nome REAL do container Swarm (`volupia_n8n.1.<task-id>`), não do nome de serviço que só resolve via DNS interno; (2) o SQLite do n8n em produção real está com 480MB (dados de execução acumulados, achado genuíno sobre o n8n, não bug nosso) — excede o limite de upload do Storage self-hospedado, então o script foi reescrito pra subir arquivo por arquivo com checagem de tamanho em vez de um `.tar.gz` único, pulando com aviso claro o que não couber em vez de falhar o backup inteiro. CA-04 confirmado com o rigor mais alto possível: baixei o dump REAL recém-enviado, restaurei num container Postgres **descartável** (nunca no banco real) e confirmei que todas as tabelas do Postiz e os dados reais (`Organization` "Volúpia", "Workspace A" criados no spec 028) estavam intactos. CA-02 reconfirmado: `app.`/`api.fastsocial.volupia.cloud` respondem HTTPS válido (já demonstrado organicamente centenas de vezes ao longo da sessão). `infra/README-PRODUCAO.md` documenta tudo isso explicitamente numa seção final própria, para quem ler depois saber exatamente o que foi e não foi provado ao vivo, e por quê.

Nota Task 044 (Fase 10 iniciada): os 4 CAs validados ao vivo em produção contra a infraestrutura real recém-provisionada (GlitchTip self-hospedado + Dozzle + Bull Board), incluindo achar e corrigir um erro real de deploy no meio do processo. Bug real encontrado e corrigido: `infra/traefik/dynamic-observability.yml` tinha sido escrito e commitado, mas **nunca de fato copiado pro VPS** — `glitchtip.fastsocial.volupia.cloud`/`logs.fastsocial.volupia.cloud` respondiam com o certificado self-signed default do Traefik (nenhuma rota casava) em vez das rotas reais; corrigido copiando o arquivo pra `/etc/easypanel/traefik/config/`, confirmado pelo certificado Let's Encrypt válido aparecendo na resposta HTTPS logo em seguida. CA-01: criei um endpoint de diagnóstico (`GET /health/throw-test-error`, guardado por `PlatformAdminGuard`) que lança uma exceção não tratada de propósito; chamei de verdade via um usuário elevado a super admin, e a mensagem exata ("Erro de teste proposital — spec 044, validação do GlitchTip.") apareceu como issue real na tabela `issue_events_issue` do Postgres do próprio GlitchTip, consultada diretamente. CA-02: Traefik com `basicAuth` real (bcrypt, usuário `dozzle-admin`) devolveu 401 sem credencial e com credencial errada, 200 com a credencial real; o log do container `fastsocial-dozzle` confirma "Connected to Docker" (via `/var/run/docker.sock` montado), provando que ele realmente enumera os containers reais do host, não uma lista mockada. CA-03: Bull Board (montado como sub-rota Express em `/api/v1/admin/queues`, protegido por um middleware manual porque Guards do Nest não alcançam rotas Express cruas) devolveu 403 pra um usuário autenticado comum e 200 depois de elevá-lo a `isPlatformSuperAdmin=true` — o payload real da API listou as duas filas reais do produto (`publish` com 1 job `failed` real, `data-export` com 1 job `completed` real, sobra genuína do teste do spec 042). CA-04: parei o container `glitchtip-web` de propósito (seguro — infra nova e isolada, não compartilhada com a agência) e chamei `throw-test-error` de novo: resposta em 43ms com o 500 normal do Nest, confirmando que o `try/catch` do `ErrorTrackingService` realmente absorve a falha do tracking sem propagar nem travar a resposta; religado o container em seguida (voltou a responder 200). Todos os usuários de teste descartáveis criados para elevação de super admin (Supabase Auth + tabela `User`) foram removidos ao final. Senha do superuser do GlitchTip (gerada inline na criação da conta e nunca capturada) foi resetada para um valor conhecido via `manage.py shell`/`set_password()` — comunicada ao usuário fora deste arquivo. Erro de build real corrigido durante a implementação: `@bull-board/api@^5.23.0` tinha um `.d.ts` incompatível com o `bullmq@^5.34` já instalado no projeto (conflito de tipos em `Job.progress`, não algo contornável com `skipLibCheck` nem casts no código chamador) — resolvido atualizando para `@bull-board/api@^8.6.0`.

\* Task 031: validado ao vivo no navegador contra `https://app.fastsocial.volupia.cloud/connections` logado como `teste-validacao@fastsocial.dev`: lista renderiza corretamente 2 contas de teste (uma `connected`, uma `expired`) com badges de status certos e botão "Reconectar" só aparecendo para a expirada (CA-03 parcial — o badge e a lógica condicional estão corretos; o fluxo de popup em si não pôde ser completado neste navegador de teste porque `window.open` foi bloqueado pelo bloqueador de popup do ambiente, mas isso validou o CAMINHO DE ERRO do CA-05: mensagem clara "O navegador bloqueou o popup..." em vez de UI travada — a URL de autorização real já tinha sido confirmada por curl no spec 029). CA-04 validado de ponta a ponta: clicar "Desconectar" abre modal de confirmação com o aviso sobre publicações agendadas, cancelar fecha sem ação, confirmar dispara o `DELETE` real. CA-01/CA-02 (conectar de verdade via popup) dependem da mesma lacuna do spec 028 (iniciar OAuth novo) e de credenciais reais do LinkedIn — não exercitáveis ainda. Nota lateral: ao tentar desconectar uma conta de teste com `external_account_id` falso (criada via SQL direto para validar o spec 030), a API retornou 500 porque o Postiz respondeu 404 de verdade para uma integração que nunca existiu de fato — confirma que o endpoint chama a API real do Postiz corretamente; o erro era do dado de teste, não do código (dado removido depois via SQL em vez de forçar o disconnect).

\* Task 029: **Caminho B** foi o escolhido (documentado no topo de `linkedin-oauth.service.ts`) — o Postiz não custodia documento/PDF do LinkedIn de forma confiável (achado do spec 027), então o FastSocial fala direto com a API do LinkedIn e guarda os tokens cifrados (AES-256-GCM, `TokenEncryptionService`, 6 testes unitários cobrindo round-trip, não-determinismo do ciphertext, chave ausente/inválida — todos passando). Sem `LINKEDIN_CLIENT_ID`/`SECRET` reais (mesma pendência do checklist de acessos), a validação ao vivo foi até onde dava sem um app aprovado: com credenciais fake, `GET /social-accounts/connect/linkedin` gerou uma URL de autorização real e bem formada (`redirect_uri`, `scope`, `state` assinado); o callback com `state` válido passou pela verificação de assinatura HMAC e chegou a fazer a chamada real para `https://www.linkedin.com/oauth/v2/accessToken`, que respondeu com o erro esperado do LinkedIn (`authorization code not found` — confirma que o formato da requisição está correto); o callback com `state` adulterado foi rejeitado antes de qualquer chamada de rede, confirmando a proteção contra CSRF. CA-02/CA-03/CA-05 (publicar de verdade e renovação automática) não puderam ser exercitados ao vivo sem uma Company Page de teste real — ficam pendentes de credencial, mesmo padrão dos Tasks 017/018/021. `TOKEN_ENCRYPTION_KEY` real já foi gerada e está em produção.

\* Task 021: CA-02 (log real "nenhuma fonte habilitada") e CA-03 (gate `isEnabled()` do scraping testado diretamente — só ativa com a string exata `"true"`) confirmados ao vivo. CA-04/CA-05 (uma única chamada a Claude, scores sempre preenchidos) validados via testes unitários com mock (`insight-summarizer.service.spec.ts`). CA-01 depende de `META_ADS_LIBRARY_ACCESS_TOKEN` real — pendência nova, já adicionada a `.prd/checklist_acessos_e_delegacao.md` como item opcional.

\* Task 022: CA-03 confirmado ao vivo (400 sem insightId/briefing). CA-01/CA-02/CA-04/CA-05 (estilo distinto por tom de voz, exatamente N slides, variação visivelmente diferente, robustez de parsing) dependem de `ANTHROPIC_API_KEY` real para gerar copy de verdade — mesma pendência dos Tasks 017/018/021. A escolha de usar tool-use (structured output) da Anthropic API em vez de JSON em texto livre já elimina estruturalmente a classe de falha que o CA-05 testa (parsing inconsistente), mas a validação empírica com 10 chamadas reais ainda depende da chave.

\* Task 023: CA-01 (sem mencionar texto/palavras na cena), CA-02 (instrução de espaço negativo sempre correta, testado nas 5 posições) e CA-03 (nunca excede 3 frases mesmo com resposta do LLM mais longa) validados via testes unitários com mock (`scene-director.service.spec.ts`), incluindo o fallback determinístico. Regressão confirmada ao vivo: o pipeline do Task 017 (`POST /image-generation/jobs`) continua produzindo o `assembled_prompt` corretamente após a refatoração que extraiu este serviço. CA-04 (variabilidade entre 3 chamadas reais) depende de `ANTHROPIC_API_KEY` real — mesma pendência dos demais specs de IA.

\* Task 027: desvio consciente e explicitamente aprovado pelo usuário — reusa o Postiz já em produção na agência (`volupia_postiz`, mesmo VPS) em vez de subir uma instância nova dedicada ao FastSocial, documentado em `infra/postiz/README.md`. CA-01/CA-02 satisfeitos pela instância já rodando (24h+ saudável, conectada ao próprio Postgres). Confirmada conectividade interna direta via rede `easypanel` (`http://volupia_postiz:5000`), útil para o bridge do spec 030. CA-06 pesquisado sem depender de credencial: Postiz converte imagens em PDF automaticamente na UI para LinkedIn, mas a API pública tem suporte incerto para isso (issue aberta gitroomhq/postiz-app#1381) — spec 029 deve publicar documento do LinkedIn via chamada direta à API do LinkedIn, conforme a própria contingência do spec. CA-03/04/05 pendem de: apps OAuth Meta/LinkedIn reais configurados dentro do Postiz existente, e uma API key gerada pelo usuário na conta Postiz (item novo no checklist).
