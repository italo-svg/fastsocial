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
| 016 | integracao-banco-imagens | ⏳ Pendente | 3 |
| 017 | motor-geracao-imagem-ia | ⏳ Pendente | 3 |
| 018 | qa-visao-imagem-ia | ⏳ Pendente | 3 |
| 019 | composicao-frontend | ⏳ Pendente | 3 |
| 020 | pesquisa-tendencias-api | ⏳ Pendente | 4 |
| 021 | conector-pesquisa-fontes | ⏳ Pendente | 4 |
| 022 | geracao-copy-claude | ⏳ Pendente | 4 |
| 023 | diretor-de-cena | ⏳ Pendente | 4 |
| 024 | pesquisa-frontend | ⏳ Pendente | 4 |
| 025 | content-pieces-api | ⏳ Pendente | 5 |
| 026 | fila-aprovacao-frontend | ⏳ Pendente | 5 |
| 027 | postiz-selfhosted-deploy | ⏳ Pendente | 6 |
| 028 | meta-oauth-bridge | ⏳ Pendente | 6 |
| 029 | linkedin-oauth-bridge | ⏳ Pendente | 6 |
| 030 | postiz-api-bridge | ⏳ Pendente | 6 |
| 031 | conexoes-frontend | ⏳ Pendente | 6 |
| 032 | n8n-selfhosted-deploy | ⏳ Pendente | 7 |
| 033 | n8n-workflow-pesquisa | ⏳ Pendente | 7 |
| 034 | n8n-workflow-geracao | ⏳ Pendente | 7 |
| 035 | n8n-workflow-agendamento-publicacao | ⏳ Pendente | 7 |
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
